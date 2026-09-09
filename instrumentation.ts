export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { verifyAllDbConnections } = await import('@/lib/db/check-connections');
    await verifyAllDbConnections();
  }
}
