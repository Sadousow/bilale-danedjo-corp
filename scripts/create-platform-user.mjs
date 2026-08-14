/**
 * Crée un compte de la console plateforme.
 *
 *   node scripts/create-platform-user.mjs "Nom" email@exemple.com "motdepasse"
 *
 * Sans argument, le script demande les valeurs de façon interactive — le mot
 * de passe n'apparaît alors pas dans l'historique du terminal.
 *
 * Relancé avec un email existant, il met à jour le nom et le mot de passe :
 * c'est aussi la procédure de réinitialisation.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function ask(question, { silent = false } = {}) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  if (silent) {
    // Masque la frappe : le mot de passe ne s'affiche pas.
    const onData = (char) => {
      if (["\n", "\r", ""].includes(char.toString())) return;
      stdout.write("[2K[200D" + question + "*".repeat(rl.line.length));
    };
    stdin.on("data", onData);
    const answer = await rl.question(question);
    stdin.off("data", onData);
    stdout.write("\n");
    rl.close();
    return answer;
  }

  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function main() {
  const [argName, argEmail, argPassword] = process.argv.slice(2);

  const name = argName ?? (await ask("Nom          : "));
  const email = (argEmail ?? (await ask("Email        : "))).trim().toLowerCase();
  const password =
    argPassword ?? (await ask("Mot de passe : ", { silent: true }));

  if (!name?.trim()) throw new Error("Le nom est obligatoire.");
  if (!email.includes("@")) throw new Error("Adresse email invalide.");
  if (!password || password.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.platformUser.findUnique({ where: { email } });

  await prisma.platformUser.upsert({
    where: { email },
    update: { name: name.trim(), passwordHash, active: true },
    create: { email, name: name.trim(), passwordHash },
  });

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const protocol = root.startsWith("localhost") ? "http" : "https";

  console.log(
    existing
      ? `\n✅ Compte mis à jour : ${email}`
      : `\n✅ Compte créé : ${email}`
  );
  console.log(`   Console : ${protocol}://${root}/superadmin`);
}

main()
  .catch((e) => {
    console.error(`\n❌ ${e.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
