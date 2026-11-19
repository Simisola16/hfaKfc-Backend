# KFC Admin Portal — Backend API Server

This folder contains the standalone backend server for the Halal Food Authority (HFA) KFC Admin Portal.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Verify `.env` has the correct configuration:
```env
PORT=5050
MONGODB_URI=mongodb+srv://olamilekanmuhayad_db_user:yNLID7xso4SGtSCm@kfchfa.q1axxfm.mongodb.net/kfc_hfa?retryWrites=true&w=majority
```

### 3. Run the Backend
```bash
# Start server
npm run dev

# Or with standard node
npm start
```

### 4. Seed Data (Optional)
```bash
npm run seed
```

## 📡 Endpoints
- `GET /api/health` - Health check & MongoDB Atlas connectivity status
- `GET /api/dashboard/stats` - Portal KPI statistics
- `GET /api/stores` - KFC Stores list
- `GET /api/franchisees` - Franchisee partners list
- `GET /api/audits` - On-site Halal audits registry
- `GET /api/products` - Approved Halal products
- `GET /api/assignments` - Audit assignment schedules
- `GET /api/requests` - Franchisee & store requests
- `GET /api/appeals` - Audit appeals queue
- `GET /api/feedback` - Store feedback evaluations
- `GET /api/map/logs` - Auditor GPS device tracking logs
- `GET /api/users` - Portal user directory
- `POST /api/auth/login` - Auditor & manager authentication
