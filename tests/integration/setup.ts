import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

let counter = 0;
export function uniqueSlug(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createTestWorkspaceAndUser() {
  const slug = uniqueSlug("test-workspace");
  const workspace = await prisma.workspace.create({
    data: { name: slug, slug },
  });
  const user = await prisma.user.create({
    data: {
      workspaceId: workspace.id,
      firstName: "Test",
      lastName: "User",
      email: `${slug}@example.com`,
      passwordHash: "not-a-real-hash",
      role: "ADMIN",
    },
  });
  return { workspace, user };
}
