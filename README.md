# 🏠 Smart Cabinet IoT Backend

A robust RESTful API backend system for IoT Smart Cabinet management, enabling real-time monitoring and control of environmental sensors, relay switches, and automated scheduling through MQTT protocol integration with Adafruit IO.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-7.x-red?logo=redis)
![MQTT](https://img.shields.io/badge/MQTT-Adafruit%20IO-blue)

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with access/refresh token mechanism
- Role-based access control (User, VIP, Admin)
- Secure password hashing with bcrypt

### 📡 Real-time IoT Communication
- MQTT protocol integration with Adafruit IO broker
- Multi-tenant architecture supporting multiple users and devices
- Real-time bidirectional communication with embedded devices

### 🌡️ Sensor Monitoring
- Temperature and humidity sensor data collection
- GPS location tracking for mobile cabinets
- Historical data storage and retrieval

### ⚡ Relay Control
- Manual ON/OFF control for 6-channel relay modules
- Real-time state synchronization between server and devices
- Activity logging for all relay operations

### ⏰ Scheduling & Automation
- Flexible schedule creation with day/time configurations
- Multi-action schedules (control multiple relays per schedule)
- Enable/disable schedules without deletion

### 📊 System Features
- Asynchronous job processing with Bull Queue + Redis
- Firmware version tracking and OTA update support
- Activity logging and audit trails
- Email notifications via Nodemailer

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Cache/Queue** | Redis + Bull Queue |
| **IoT Protocol** | MQTT (Adafruit IO) |
| **Authentication** | JWT (jsonwebtoken) |
| **Security** | Helmet, bcrypt, CORS |
| **Email** | Nodemailer |
| **File Storage** | GridFS (MongoDB) |

---

## 🏗️ Architecture

```
┌─────────────────┐     MQTT/TLS      ┌──────────────────┐
│  IoT Devices    │◄────────────────►│  Adafruit IO     │
│  (ESP32/ESP8266)│                   │  MQTT Broker     │
└─────────────────┘                   └────────┬─────────┘
                                               │
                                               ▼
┌─────────────────┐    HTTP/REST      ┌──────────────────┐
│  Mobile App /   │◄────────────────►│  Express.js      │
│  Web Client     │                   │  API Server      │
└─────────────────┘                   └────────┬─────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
           ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
           │   MongoDB    │          │    Redis     │          │  Bull Queue  │
           │   Atlas      │          │    Cache     │          │  (Job Queue) │
           └──────────────┘          └──────────────┘          └──────────────┘
```

---

## 📁 Project Structure

```
src/
├── config/
│   ├── database.js          # MongoDB Atlas connection
│   └── email.js             # Nodemailer transporter config
├── connect/
│   └── mqttController.js    # MQTT client management & message handling
├── controllers/
│   ├── userController.js    # User authentication & profile
│   ├── cabinetController.js # Cabinet CRUD operations
│   ├── sensorController.js  # Sensor data retrieval
│   ├── relayController.js   # Relay control operations
│   ├── scheduleController.js# Schedule management
│   ├── logController.js     # Activity logs
│   └── firmwareController.js# Firmware management
├── middlewares/
│   ├── authenticateToken.js # JWT verification
│   ├── checkRole.js         # Role-based authorization
│   └── refreshToken.js      # Token refresh logic
├── models/
│   ├── Users.js             # User schema
│   ├── Cabinet.js           # Cabinet/Device schema
│   ├── Relay.js             # Relay state schema
│   ├── Schedule.js          # Automation schedule schema
│   ├── TemperatureSensors.js# Temperature data schema
│   ├── HumiditySensors.js   # Humidity data schema
│   ├── Location.js          # GPS location schema
│   └── Log.js               # Activity log schema
├── queue/
│   ├── sensorQueue.js       # Sensor data processing queue
│   ├── relayQueue.js        # Relay state update queue
│   ├── logQueue.js          # Log writing queue
│   └── bullBoard.js         # Queue monitoring dashboard
├── routes/
│   └── *.js                 # API route definitions
└── server.js                # Application entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB Atlas account (or local MongoDB)
- Redis server running locally
- Adafruit IO account (for MQTT)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/smart-cabinet-backend.git
cd smart-cabinet-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3001
HOST_NAME=localhost

# MongoDB Atlas
DATABASE_NAME=your_mongodb_username
DATABASE_PASSWORD=your_mongodb_password

# JWT Secrets
accessTokenSecret=your_access_token_secret
refreshTokenSecret=your_refresh_token_secret

# Adafruit IO (MQTT)
AIO_PORT=8883

# Email (Nodemailer)
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
node src/server.js
```

The server will start at `http://localhost:3001`

### Queue Dashboard

Access Bull Queue monitoring dashboard at:
```
http://localhost:3001/admin/queues
```

---

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user with Adafruit IO credentials |
| POST | `/login` | User login |
| POST | `/refresh-token` | Refresh access token |
| POST | `/logout` | User logout |

### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get user profile |
| PUT | `/profile` | Update user profile |
| PUT | `/profile/avatar` | Upload avatar |

### Cabinet Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cabinet` | Get all user cabinets |
| GET | `/cabinet/:id` | Get cabinet details |
| PUT | `/cabinet/:id` | Update cabinet info |
| DELETE | `/cabinet/:id` | Delete cabinet |

### Sensors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sensor/:cabinetId/temperature` | Get temperature data |
| GET | `/sensor/:cabinetId/humidity` | Get humidity data |
| GET | `/sensor/:cabinetId/location` | Get GPS location |

### Relay Control
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/relay/:cabinetId` | Get all relays status |
| PUT | `/relay/:cabinetId/toggle` | Toggle relay state |
| PUT | `/relay/:cabinetId/name` | Update relay name |

### Schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schedule/:cabinetId` | Get all schedules |
| POST | `/schedule/:cabinetId` | Create new schedule |
| PUT | `/schedule/:cabinetId` | Update schedule |
| PUT | `/schedule/:cabinetId/status` | Enable/disable schedule |
| DELETE | `/schedule/:cabinetId` | Delete schedule |

### Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/log/:cabinetId` | Get activity logs |

---

## 🔒 Security Features

- **Helmet.js** - HTTP security headers
- **CORS** - Cross-Origin Resource Sharing protection
- **bcrypt** - Password hashing (salt rounds: 10)
- **JWT** - Stateless authentication
- **Input Validation** - Request body validation
- **Rate Limiting** - (Recommended to add)

---

## 📊 Data Models

### User
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: ['user', 'vip', 'admin'],
  AIO_USERNAME: String,  // Adafruit IO username
  AIO_KEY: String,       // Adafruit IO API key
  phone_number: String
}
```

### Cabinet
```javascript
{
  userID: ObjectId,
  name: String,
  description: String,
  device_id: String,     // Hardware device identifier
  board: ['Relay 6ch']
}
```

### Schedule
```javascript
{
  userID: ObjectId,
  cabinetID: ObjectId,
  schedule_id: Number,
  schedule_name: String,
  state: Boolean,
  day: [String],         // ['Mon', 'Tue', 'Wed', ...]
  time: String,          // 'HH:MM'
  actions: [{
    relayId: Number,
    action: String       // 'ON' | 'OFF'
  }]
}
```

---

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Test API endpoints with curl
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👥 Authors

- **Danh Son Ha & Nguyen Anh Tuan** - *Backend Development & System Design*

---

## 🙏 Acknowledgments

- [Adafruit IO](https://io.adafruit.com/) - MQTT Broker Service
- [MongoDB Atlas](https://www.mongodb.com/atlas) - Cloud Database
- [Bull Queue](https://github.com/OptimalBits/bull) - Redis-based Queue

---

<p align="center">
  Made with ❤️ for IoT Innovation
</p>
