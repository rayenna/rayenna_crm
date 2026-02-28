import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT ?? 5001;

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║     🚀 Proposal Engine Backend       ║');
  console.log(`  ║     Running on port ${PORT}             ║`);
  console.log('  ║     GET /health → status check       ║');
  console.log('  ║     Isolated from main CRM           ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
