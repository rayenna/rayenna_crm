import { PrismaClient } from '@prisma/client';

/**
 * Generates a unique 6-digit alphanumeric customer ID
 * Format: 3 letters + 3 numbers (e.g., ABC123)
 */
export async function generateCustomerId(prisma?: PrismaClient): Promise<string> {
  const client = prisma || new PrismaClient();
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    // Generate 3 random letters
    const letterPart = Array.from({ length: 3 }, () => 
      letters[Math.floor(Math.random() * letters.length)]
    ).join('');
    
    // Generate 3 random numbers
    const numberPart = Array.from({ length: 3 }, () => 
      numbers[Math.floor(Math.random() * numbers.length)]
    ).join('');
    
    const customerId = letterPart + numberPart;
    
    // Check if it already exists
    const existing = await client.customer.findUnique({
      where: { customerId },
    });
    
    if (!existing) {
      if (!prisma) {
        await client.$disconnect();
      }
      return customerId;
    }
    
    attempts++;
  }
  
  if (!prisma) {
    await client.$disconnect();
  }
  
  // Fallback: if we can't generate a unique ID after max attempts, throw error
  throw new Error('Unable to generate unique customer ID after multiple attempts');
}
