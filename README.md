# Campus Explorer - Querying Project

A web-based data querying system for analyzing course and room data from UBC. This project provides a RESTful API and web interface for executing complex queries on educational datasets.

## 🚀 Features

- **RESTful API** for data querying
- **Web Interface** for building queries visually
- **Course Data Analysis** with 64,612+ course records
- **Advanced Query Support** including filters, transformations, and aggregations
- **Real-time Query Execution** with result limiting

## 📋 Prerequisites

- **Node.js** >= 14 (tested with v24.2.0)
- **npm** or **yarn** package manager

## 📦 Dependency Management

This project uses standard Node.js dependency management:

- **Dependencies are NOT included** in the repository (excluded via `.gitignore`)
- **`node_modules/` folder is ignored** to keep the repository lightweight
- **Dependencies are specified** in `package.json` and `package-lock.json`/`yarn.lock`
- **Automatic recreation** of dependencies when cloning the repository

### Why `node_modules` is excluded:
- **Size**: Can be hundreds of MB to several GB
- **Platform-specific**: Contains binaries that may not work across different systems
- **Redundant**: Easily recreated with `npm install` or `yarn install`
- **Best practice**: Dependencies should be managed through package files, not version control

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd QueryingProject-main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```
   > **Note**: The `node_modules` folder will be created automatically. This folder is excluded from version control via `.gitignore`.

3. **Compile TypeScript:**
   ```bash
   npx tsc
   ```

## 🏃‍♂️ Running the Application

### Start the Server
```bash
npm start
```
or
```bash
node src/App.js
```

The server will start on **http://localhost:4321**

### Access the Web Interface
Open your browser and navigate to:
```
http://localhost:4321
```

## 📊 Available Datasets

### Courses Dataset
- **ID**: `courses`
- **Records**: 64,612 course sections
- **Fields**:
  - `courses_dept` - Department (e.g., "cpsc", "math")
  - `courses_id` - Course ID (e.g., "110", "210")
  - `courses_avg` - Average grade
  - `courses_pass` - Number of students who passed
  - `courses_fail` - Number of students who failed
  - `courses_audit` - Number of audit students
  - `courses_title` - Course title
  - `courses_instructor` - Instructor name
  - `courses_uuid` - Unique identifier
  - `courses_year` - Year (1900 for overall)

## 🔌 API Endpoints

### GET `/datasets`
List all available datasets.
```bash
curl http://localhost:4321/datasets
```

### GET `/echo/:msg`
Test endpoint that echoes the message.
```bash
curl http://localhost:4321/echo/hello
```

### POST `/query`
Execute a query on the dataset.

**Request Body:**
```json
{
  "WHERE": {
    "GT": {
      "courses_avg": 85
    }
  },
  "OPTIONS": {
    "COLUMNS": ["courses_dept", "courses_id", "courses_avg", "courses_title"]
  }
}
```

## 📝 Query Examples

### 1. Find High-Performing Courses
```json
{
  "WHERE": {
    "GT": {
      "courses_avg": 85
    }
  },
  "OPTIONS": {
    "COLUMNS": ["courses_dept", "courses_id", "courses_avg", "courses_title"]
  }
}
```

### 2. Search by Department
```json
{
  "WHERE": {
    "IS": {
      "courses_dept": "*cpsc*"
    }
  },
  "OPTIONS": {
    "COLUMNS": ["courses_dept", "courses_id", "courses_avg"]
  }
}
```

### 3. Complex Filter with Multiple Conditions
```json
{
  "WHERE": {
    "AND": [
      {
        "GT": {
          "courses_pass": 50
        }
      },
      {
        "GT": {
          "courses_avg": 80
        }
      }
    ]
  },
  "OPTIONS": {
    "COLUMNS": ["courses_dept", "courses_id", "courses_avg", "courses_pass"]
  }
}
```

### 4. Group by Department with Count
```json
{
  "WHERE": {},
  "TRANSFORMATIONS": {
    "GROUP": ["courses_dept"],
    "APPLY": [
      {
        "count": {
          "COUNT": "courses_id"
        }
      }
    ]
  },
  "OPTIONS": {
    "COLUMNS": ["courses_dept", "count"],
    "ORDER": {
      "dir": "DOWN",
      "keys": ["count"]
    }
  }
}
```

## 🔍 Query Syntax

### WHERE Clauses
- **GT**: Greater than (for numeric fields)
- **LT**: Less than (for numeric fields)
- **EQ**: Equal to (for numeric fields)
- **IS**: String matching with wildcards (use `*` for partial matches)
- **AND**: Logical AND operation
- **OR**: Logical OR operation
- **NOT**: Logical NOT operation

### OPTIONS
- **COLUMNS**: Array of field names to return
- **ORDER**: Sorting (string field name or object with `dir` and `keys`)

### TRANSFORMATIONS
- **GROUP**: Array of fields to group by
- **APPLY**: Array of aggregation rules
  - **COUNT**: Count unique values
  - **MAX**: Maximum value
  - **MIN**: Minimum value
  - **AVG**: Average value
  - **SUM**: Sum of values

## 🧪 Testing

### Using curl
```bash
# Test echo endpoint
curl http://localhost:4321/echo/hello

# Test datasets endpoint
curl http://localhost:4321/datasets

# Test query endpoint
curl -X POST http://localhost:4321/query \
  -H "Content-Type: application/json" \
  -d '{
    "WHERE": {
      "GT": {
        "courses_avg": 85
      }
    },
    "OPTIONS": {
      "COLUMNS": ["courses_dept", "courses_id", "courses_avg"]
    }
  }'
```

### Using the Web Interface
1. Open `http://localhost:4321` in your browser
2. Use the visual query builder
3. Click "Send Query" to execute

## 🏗️ Project Structure

```
QueryingProject-main/
├── src/
│   ├── App.ts                 # Main application entry point
│   ├── controller/
│   │   ├── IInsightFacade.ts  # Interface definitions
│   │   └── InsightFacade.ts   # Main business logic
│   ├── dataFunctions/
│   │   ├── QueryPerform.ts    # Query execution logic
│   │   ├── QueryValidationBody.ts # Query validation
│   │   └── DatasetHelper.ts   # Dataset processing
│   ├── rest/
│   │   └── Server.ts          # HTTP server implementation
│   └── Util.ts               # Logging utilities
├── frontend/
│   └── public/               # Web interface files
├── data/
│   └── courses               # Course dataset
└── package.json
```

## 🐛 Troubleshooting

### Common Issues

1. **"No such module: http_parser"**
   - This has been fixed by using Node.js built-in HTTP module
   - If you encounter this, ensure you're using the updated code

2. **"COLUMNS keys are invalid"**
   - Use correct field names with `courses_` prefix
   - Check the available fields list above

3. **"result is too large"**
   - Add filters to your WHERE clause to limit results
   - Maximum 5000 results allowed

4. **"address already in use"**
   - Kill existing processes: `lsof -ti:4321 | xargs kill -9`
   - Or use a different port

### Server Not Starting
```bash
# Check if port is in use
lsof -i :4321

# Kill existing processes
lsof -ti:4321 | xargs kill -9

# Restart server
npm start
```

## 📚 Development

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the GPL-3.0 License.

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Ensure all dependencies are installed
3. Verify Node.js version compatibility
4. Check server logs for detailed error messages

## 🎯 Quick Start Summary

1. **Install**: `npm install`
2. **Start**: `npm start`
3. **Open**: `http://localhost:4321`
4. **Query**: Use the web interface or API endpoints
5. **Enjoy**: Explore the course data with powerful queries!

---

**Happy Querying!** 🚀

