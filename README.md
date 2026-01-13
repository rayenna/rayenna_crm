# Rayenna CRM - Solar EPC Project Management System

A comprehensive CRM + Project Operations system for Rayenna Energy, a solar EPC company operating primarily in India. This system manages the entire lifecycle from Lead → Sale → Project Execution → Subsidy → Payments → Profitability.

## Features

### Core Modules

1. **Lead & Customer Management**
   - Customer master with auto-incrementing SL No
   - Contact information, consumer numbers, project types
   - Lead source tracking and salesperson assignment

2. **Sales & Commercial Details**
   - System capacity (kW) and project cost tracking
   - Confirmation dates and loan details
   - Auto-calculated expected profit

3. **Project Execution & Compliance**
   - MNRE portal registration tracking
   - KSEB feasibility and registration dates
   - Installation completion and subsidy tracking
   - Project status workflow management

4. **Payment & Finance Tracking**
   - Milestone-based payment tracking (Advance, Payment 1-3, Last Payment)
   - Auto-calculated total received, balance, and payment status
   - Tally integration with Excel/XML/JSON export

5. **Documentation & Remarks**
   - Document upload and categorization
   - Remarks and internal notes (sales-only)
   - Full audit trail for all changes

### User Roles & Permissions

- **Admin**: Full access, user management, master data edits
- **Sales**: Create/edit leads, update commercial details, view payments (read-only)
- **Operations**: Update execution milestones, upload compliance documents
- **Finance**: Update payments, export to Tally, view profitability
- **Management**: Read-only dashboards and reports

### Dashboards

- **Sales Dashboard**: Leads vs conversions, capacity sold, revenue by salesperson
- **Operations Dashboard**: Pending installations, subsidy status, KSEB/MNRE bottlenecks
- **Finance Dashboard**: Project value, amount received, outstanding balance, profit analysis
- **Management Dashboard**: Aggregated view of all metrics

## Tech Stack

### Backend
- **Node.js** with **Express** and **TypeScript**
- **PostgreSQL** database with **Prisma ORM**
- **JWT** authentication
- **Multer** for file uploads
- **Excel/XML/JSON** export for Tally integration

### Frontend
- **React** with **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **React Router** for navigation
- **React Hook Form** for forms

## Quick Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/rayenna/rayenna_crm.git
cd rayenna_crm
```

### Step 2: Install Dependencies

**For Bash/Git Bash/Linux/Mac:**
```bash
npm install
cd client && npm install && cd ..
```

**For PowerShell (Windows):**
```powershell
npm install
cd client; npm install; cd ..
```

### Step 3: Set Up Database

1. **Install PostgreSQL** (if not installed)
   - Download from: https://www.postgresql.org/download/
   - Create database: `rayenna_crm`

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and update:
   - `DATABASE_URL` with your PostgreSQL credentials
   - `OPENAI_API_KEY` for AI proposal generation (optional, see `SETUP_OPENAI_API.md`)
   - `JWT_SECRET` for authentication

3. **Run Migrations**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

### Step 4: Start Application

```bash
npm run dev
```

Access at: http://localhost:5173

**Default Login:**
- Admin: admin@rayenna.com / admin123
- Sales: sales@rayenna.com / sales123

See `QUICKSTART.md` for detailed setup instructions.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rayenna-crm
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   
   **For Bash/Git Bash/Linux/Mac:**
   ```bash
   cd client && npm install && cd ..
   ```
   
   **For PowerShell (Windows):**
   ```powershell
   cd client; npm install; cd ..
   ```
   
   Or run separately:
   ```powershell
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `PORT`: Backend server port (default: 3000)

5. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   ```

6. **Create initial admin user**
   ```bash
   # You can use Prisma Studio to create the first admin user
   npm run prisma:studio
   ```
   
   Or create a seed script (see `prisma/seed.ts` example below)

7. **Start the development servers**
   ```bash
   # Start both backend and frontend
   npm run dev
   ```
   
   Or start them separately:
   ```bash
   # Backend (port 3000)
   npm run dev:server
   
   # Frontend (port 5173)
   npm run dev:client
   ```

8. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Prisma Studio: Run `npm run prisma:studio`

## Database Schema

The system uses the following main models:

- **User**: Authentication and authorization
- **Project**: Main project/customer record
- **Document**: File uploads linked to projects
- **AuditLog**: Complete audit trail of all changes

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List projects (with filters)
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (Admin only)

### Documents
- `GET /api/documents/project/:projectId` - Get project documents
- `POST /api/documents/project/:projectId` - Upload document
- `DELETE /api/documents/:id` - Delete document

### Dashboards
- `GET /api/dashboard/sales` - Sales dashboard data
- `GET /api/dashboard/operations` - Operations dashboard data
- `GET /api/dashboard/finance` - Finance dashboard data
- `GET /api/dashboard/management` - Management dashboard data

### Tally Export
- `GET /api/tally/export/excel` - Export to Excel
- `GET /api/tally/export/json` - Export to JSON
- `GET /api/tally/export/xml` - Export to XML

### Users (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Automation Features

The system automatically:

- Calculates `totalAmountReceived` and `balanceAmount` from payment fields
- Updates `paymentStatus` (PENDING/PARTIAL/FULLY_PAID) based on payments
- Calculates `expectedProfit` from project cost and system capacity
- Maintains audit logs for all changes
- Updates project status based on milestone completion

## Tally Integration

The system exports financial data in Tally-friendly formats:

- **Excel**: `.xlsx` format with columns: SL No, Customer Name, Invoice Amount, Payment Received, Outstanding Balance
- **JSON**: Structured JSON format
- **XML**: XML format compatible with Tally

Export can be filtered by date range and project status.

## Development

### Project Structure

```
rayenna-crm/
├── src/                 # Backend source code
│   ├── routes/         # API routes
│   ├── middleware/     # Auth middleware
│   ├── utils/          # Utility functions
│   └── server.ts       # Express server
├── client/             # Frontend React app
│   └── src/
│       ├── components/ # React components
│       ├── pages/      # Page components
│       ├── contexts/   # React contexts
│       └── types/      # TypeScript types
├── prisma/             # Database schema
└── uploads/            # Uploaded files
```

### Building for Production

```bash
# Build both backend and frontend
npm run build

# Start production server
npm start
```

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Role-based access control (RBAC)
- Input validation using express-validator
- File upload restrictions (type and size)

## Future Enhancements

- Mobile app (React Native)
- Real-time notifications
- Email alerts for milestones
- Advanced reporting and analytics
- Direct Tally API integration
- Multi-tenant support

## License

Proprietary - Rayenna Energy

## Support

For issues and questions, please contact the development team.
