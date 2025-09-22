# Docker Build Issues & Solutions

## The Python Problem

### Why do we need Python for a Node.js app?

You might be wondering "why the hell does my Node.js app need Python?" Here's the deal:

**The culprit: `better-sqlite3`**

This package is a "native module" - it's not pure JavaScript. Instead, it includes C++ code that gets compiled during installation using `node-gyp` (Node.js's native addon build tool).

**The chain of dependencies:**
1. `better-sqlite3` needs to compile C++ code
2. `node-gyp` handles the compilation
3. `node-gyp` requires Python to run the build scripts
4. It also needs `make` and `g++` (C++ compiler)

### Solutions

#### Option 1: Install Build Dependencies (Current Approach)
```dockerfile
# Install what node-gyp needs
RUN apk add --no-cache python3 make g++

# Install packages (this will compile better-sqlite3)
RUN npm ci

# Clean up build tools to keep image small
RUN apk del python3 make g++
```

**Pros:**
- Fast SQLite performance
- Small runtime image (build tools removed)

**Cons:**  
- Longer build time
- More complex Dockerfile

#### Option 2: Use Pure JavaScript SQLite
Replace `better-sqlite3` with `sqlite3` (pure JS implementation):

```bash
npm remove better-sqlite3
npm install sqlite3
```

**Pros:**
- No build dependencies needed
- Simpler Dockerfile
- Faster builds

**Cons:**
- Slower SQLite performance
- Might need code changes

#### Option 3: Use Pre-built Binaries
Some packages offer pre-built binaries, but `better-sqlite3` doesn't always have them for Alpine Linux.

### GitHub Actions Impact

The same issue can happen in CI/CD:

```yaml
# In GitHub Actions, use ubuntu-latest (has build tools)
runs-on: ubuntu-latest

# Or install build dependencies
- name: Install build deps
  run: |
    sudo apt-get update
    sudo apt-get install -y python3 build-essential
```

### Alternative Databases

If SQLite is causing too much trouble, consider:

- **Azure SQL Database** - managed SQL in Azure
- **Cosmos DB** - NoSQL, serverless billing  
- **In-memory storage** - for dev/testing
- **PostgreSQL** - if you need more power

### The "Why Not Just Use X" Question

**Q: Why not use a different SQLite library?**
A: `better-sqlite3` is actually much faster and has a better API. The build complexity is worth it for performance.

**Q: Why not use a cloud database?**  
A: SQLite is perfect for this simple quote API. Adding a cloud DB is overkill and costs money.

**Q: Why not just use JSON files?**
A: Because then we can't do proper queries, concurrent writes would be a mess, and we'd lose ACID properties.

## Quick Fixes

**Build failing locally?**
```bash
# Make sure you have build tools
# On macOS:
xcode-select --install

# On Ubuntu/Debian:
sudo apt-get install python3 build-essential

# On Windows:
npm install --global windows-build-tools
```

**Want to avoid the complexity?**
Use the alternative Dockerfile:
```bash
docker build -f Dockerfile.alternative -t quote-api .
```

**Still having issues?**
The nuclear option - switch to a different database entirely. But honestly, the current approach works fine once you understand what's happening.
