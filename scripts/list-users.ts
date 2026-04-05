import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        role: 'asc',
      },
    });

    const admins = users.filter(u => u.role === 'ADMIN');
    const regularUsers = users.filter(u => u.role !== 'ADMIN');

    let output = "--- ADMINS ---\n";
    admins.forEach(admin => {
        output += `[ID: ${admin.id}] ${admin.username} (${admin.email}) - Status: ${admin.status}\n`;
    });

    output += "\n--- USERS ---\n";
    regularUsers.forEach(user => {
        output += `[ID: ${user.id}] ${user.username} (${user.email}) - Status: ${user.status}\n`;
    });

    output += `\nSummary: ${admins.length} Admins, ${regularUsers.length} Users. Total: ${users.length}\n`;
    
    const fs = require('fs');
    fs.writeFileSync('user-registry-output.txt', output);
    console.log("Output written to user-registry-output.txt");
  } catch (error) {
    console.error("Error fetching users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
