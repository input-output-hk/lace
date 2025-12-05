#!/bin/bash
# Skills Installation Script for Linux/macOS
# Installs all dependencies for Claude Code skills

set -e

# Parse command line arguments
SKIP_CONFIRM=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -y|--yes) SKIP_CONFIRM=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check for NON_INTERACTIVE environment variable
if [[ -n "${NON_INTERACTIVE}" ]]; then
    SKIP_CONFIRM=true
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Print functions (must be defined before check_bash_version)
print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check Bash version (3.2+ required for compatibility)
check_bash_version() {
    # Get major version number
    bash_major="${BASH_VERSINFO[0]}"

    if [ "$bash_major" -lt 3 ]; then
        print_error "Bash 3.0+ required (found Bash $BASH_VERSION)"
        print_info "Please upgrade Bash and re-run this script"
        exit 1
    fi

    if [ "$bash_major" -lt 4 ]; then
        print_warning "Bash 3.x detected (Bash 4+ recommended)"

        if [[ "$OSTYPE" == "darwin"* ]]; then
            print_info "macOS ships with Bash 3.2 by default"
            print_info "For better compatibility: brew install bash"
            print_info "Then use: /usr/local/bin/bash install.sh"
        fi

        print_info "Continuing with compatibility mode..."
    fi
}

OS=$(detect_os)
check_bash_version

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if user can run sudo (without password prompt in non-interactive mode)
can_sudo() {
    # Already root
    if [[ $EUID -eq 0 ]]; then
        return 0
    fi
    # Check for passwordless sudo
    if sudo -n true 2>/dev/null; then
        return 0
    fi
    return 1
}

# Track if we've already asked about sudo elevation
SUDO_CHECKED=false
SUDO_AVAILABLE=false

# Check and prompt for sudo if needed (Linux only)
check_sudo_access() {
    if [[ "$OS" != "linux" ]]; then
        return 0
    fi

    if [[ "$SUDO_CHECKED" == "true" ]]; then
        return 0
    fi
    SUDO_CHECKED=true

    # Already root
    if [[ $EUID -eq 0 ]]; then
        SUDO_AVAILABLE=true
        return 0
    fi

    # Check for passwordless sudo
    if sudo -n true 2>/dev/null; then
        SUDO_AVAILABLE=true
        return 0
    fi

    # Need to ask user
    print_warning "Some packages (FFmpeg, ImageMagick) require sudo to install."

    if [[ "$SKIP_CONFIRM" == "true" ]]; then
        print_info "Running in non-interactive mode. Skipping packages requiring sudo."
        print_info "Install manually: sudo apt-get install ffmpeg imagemagick"
        SUDO_AVAILABLE=false
        return 1
    fi

    echo ""
    read -r -p "Do you want to enter your password to install system packages? [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY])
            # Prompt for sudo password now (caches for subsequent commands)
            if sudo -v; then
                SUDO_AVAILABLE=true
                print_success "Sudo access granted"
                return 0
            else
                print_warning "Sudo authentication failed. Skipping system packages."
                SUDO_AVAILABLE=false
                return 1
            fi
            ;;
        *)
            print_info "Skipping system packages requiring sudo."
            print_info "Install manually later: sudo apt-get install ffmpeg imagemagick"
            SUDO_AVAILABLE=false
            return 1
            ;;
    esac
}

# Install a package with sudo (Linux) or brew (macOS)
install_system_package() {
    local package_name="$1"
    local display_name="$2"
    local check_commands="$3"  # Comma-separated commands to check

    # Check if already installed (check multiple commands)
    IFS=',' read -ra cmds <<< "$check_commands"
    for cmd in "${cmds[@]}"; do
        if command_exists "$cmd"; then
            print_success "$display_name already installed"
            return 0
        fi
    done

    print_info "Installing $display_name..."

    if [[ "$OS" == "macos" ]]; then
        if brew install "$package_name"; then
            print_success "$display_name installed"
            return 0
        else
            print_warning "$display_name installation failed"
            return 1
        fi
    elif [[ "$OS" == "linux" ]]; then
        if [[ "$SUDO_AVAILABLE" != "true" ]]; then
            print_warning "$display_name requires sudo. Skipping..."
            print_info "Install manually: sudo apt-get install $package_name"
            return 1
        fi

        if sudo apt-get install -y "$package_name"; then
            print_success "$display_name installed"
            return 0
        else
            print_warning "$display_name installation failed"
            return 1
        fi
    fi

    return 1
}

# Check and install system package manager
check_package_manager() {
    if [[ "$OS" == "macos" ]]; then
        if ! command_exists brew; then
            print_warning "Homebrew not found. Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            print_success "Homebrew installed"
        else
            print_success "Homebrew found"
        fi
    elif [[ "$OS" == "linux" ]]; then
        if command_exists apt-get; then
            print_success "apt-get found"
        elif command_exists yum; then
            print_success "yum found"
        else
            print_error "No supported package manager found (apt-get or yum)"
            exit 1
        fi
    fi
}

# Install system dependencies
install_system_deps() {
    print_header "Installing System Dependencies"

    # Check sudo access first (Linux only) - prompts user once
    if [[ "$OS" == "linux" ]]; then
        # Update apt cache if we have sudo
        check_sudo_access
        if [[ "$SUDO_AVAILABLE" == "true" ]]; then
            print_info "Updating package lists..."
            sudo apt-get update -qq
        fi
    fi

    # FFmpeg (required for media-processing skill)
    install_system_package "ffmpeg" "FFmpeg" "ffmpeg"

    # ImageMagick (required for media-processing skill)
    install_system_package "imagemagick" "ImageMagick" "magick,convert"

    # PostgreSQL client (optional)
    if command_exists psql; then
        print_success "PostgreSQL client already installed"
    else
        print_warning "PostgreSQL client not found. Skipping (optional)..."
    fi

    # Docker (optional)
    if command_exists docker; then
        print_success "Docker already installed ($(docker --version))"
    else
        print_warning "Docker not found. Skipping (optional)..."
        print_info "Install Docker from: https://docs.docker.com/get-docker/"
    fi
}

# Install Node.js and npm packages
install_node_deps() {
    print_header "Installing Node.js Dependencies"

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js already installed ($NODE_VERSION)"
    else
        print_info "Installing Node.js..."
        if [[ "$OS" == "macos" ]]; then
            brew install node
        elif [[ "$OS" == "linux" ]]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        print_success "Node.js installed"
    fi

    # Install global npm packages
    print_info "Installing global npm packages..."

    # Package name to CLI command mapping (some packages have different CLI names)
    # Using indexed array with colon-separated pairs for Bash 3.2+ compatibility
    npm_packages=(
        "rmbg-cli:rmbg"
        "pnpm:pnpm"
        "wrangler:wrangler"
        "repomix:repomix"
    )

    for package_pair in "${npm_packages[@]}"; do
        # Split "package:command" on colon
        IFS=':' read -r package cmd <<< "$package_pair"

        # Check CLI command first (handles standalone installs like brew, curl, etc.)
        if command_exists "$cmd"; then
            version=$("$cmd" --version 2>&1 | head -n1 || echo "available")
            print_success "$package already installed ($version)"
        # Fallback: check if installed via npm registry
        elif npm list -g "$package" >/dev/null 2>&1; then
            print_success "$package already installed via npm"
        else
            print_info "Installing $package..."
            npm install -g "$package" 2>/dev/null || {
                print_warning "Failed to install $package globally. Trying with sudo..."
                sudo npm install -g "$package"
            }
            print_success "$package installed"
        fi
    done

    # Install local npm packages for skills
    print_info "Installing local npm packages for skills..."

    # chrome-devtools
    if [ -d "$SCRIPT_DIR/chrome-devtools/scripts" ] && [ -f "$SCRIPT_DIR/chrome-devtools/scripts/package.json" ]; then
        print_info "Installing chrome-devtools dependencies..."
        (cd "$SCRIPT_DIR/chrome-devtools/scripts" && npm install --quiet)
        print_success "chrome-devtools dependencies installed"
    fi

    # sequential-thinking
    if [ -d "$SCRIPT_DIR/sequential-thinking" ] && [ -f "$SCRIPT_DIR/sequential-thinking/package.json" ]; then
        print_info "Installing sequential-thinking dependencies..."
        (cd "$SCRIPT_DIR/sequential-thinking" && npm install --quiet)
        print_success "sequential-thinking dependencies installed"
    fi

    # mcp-management
    if [ -d "$SCRIPT_DIR/mcp-management/scripts" ] && [ -f "$SCRIPT_DIR/mcp-management/scripts/package.json" ]; then
        print_info "Installing mcp-management dependencies..."
        (cd "$SCRIPT_DIR/mcp-management/scripts" && npm install --quiet)
        print_success "mcp-management dependencies installed"
    fi

    # Optional: Shopify CLI (ask user unless auto-confirming)
    if [ -d "$SCRIPT_DIR/shopify" ]; then
        if [[ "$SKIP_CONFIRM" == "true" ]]; then
            print_info "Skipping Shopify CLI installation (optional, use --yes to install all)"
        else
            read -p "Install Shopify CLI for Shopify skill? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Installing Shopify CLI..."
                npm install -g @shopify/cli @shopify/theme 2>/dev/null || {
                    print_warning "Failed to install Shopify CLI globally. Trying with sudo..."
                    sudo npm install -g @shopify/cli @shopify/theme
                }
                print_success "Shopify CLI installed"
            fi
        fi
    fi
}

# Setup Python virtual environment
setup_python_env() {
    print_header "Setting Up Python Environment"

    # Track successful and failed installations
    local successful_skills=()
    local failed_skills=()

    # Check Python
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version)
        PYTHON_PATH=$(which python3)
        print_success "Python3 found ($PYTHON_VERSION)"

        # Check for broken UV Python installation
        if [[ "$PYTHON_PATH" == *"/.local/share/uv/"* ]]; then
            # Verify UV Python works by testing venv creation
            if ! python3 -c "import sys; sys.exit(0 if '/install' not in sys.base_prefix else 1)" 2>/dev/null; then
                print_error "UV Python installation is broken (corrupted sys.base_prefix)"
                print_info "Please reinstall Python using Homebrew:"
                print_info "  brew install python@3.12"
                print_info "  export PATH=\"/opt/homebrew/bin:\$PATH\""
                print_info "Or fix UV Python:"
                print_info "  uv python uninstall 3.12"
                print_info "  uv python install 3.12"
                exit 1
            fi
        fi
    else
        print_error "Python3 not found. Please install Python 3.7+"
        exit 1
    fi

    # Create virtual environment (or recreate if corrupted)
    create_venv() {
        # Try normal venv creation first
        if python3 -m venv "$VENV_DIR" 2>/dev/null; then
            return 0
        fi

        # If ensurepip fails (common on macOS), create without pip and bootstrap manually
        print_warning "Standard venv creation failed, trying without ensurepip..."
        if python3 -m venv --without-pip "$VENV_DIR"; then
            # Bootstrap pip manually with error handling
            source "$VENV_DIR/bin/activate"
            if ! curl -sS https://bootstrap.pypa.io/get-pip.py | python3; then
                print_error "Failed to bootstrap pip (network issue or get-pip.py failed)"
                deactivate
                rm -rf "$VENV_DIR"
                return 1
            fi
            deactivate
            return 0
        fi

        return 1
    }

    if [ -d "$VENV_DIR" ]; then
        # Verify venv is valid by checking for activate script AND python executable
        if [ -f "$VENV_DIR/bin/activate" ] && [ -x "$VENV_DIR/bin/python3" ]; then
            print_success "Virtual environment already exists at $VENV_DIR"
        else
            print_warning "Virtual environment is corrupted (missing activate or python3). Recreating..."
            rm -rf "$VENV_DIR"
            if create_venv; then
                print_success "Virtual environment recreated"
            else
                print_error "Failed to create virtual environment"
                exit 1
            fi
        fi
    else
        print_info "Creating virtual environment at $VENV_DIR..."
        if create_venv; then
            print_success "Virtual environment created"
        else
            print_error "Failed to create virtual environment"
            exit 1
        fi
    fi

    # Activate and install packages
    print_info "Activating virtual environment..."
    source "$VENV_DIR/bin/activate"

    # Create log directory
    local LOG_DIR="$VENV_DIR/logs"
    mkdir -p "$LOG_DIR"

    # Upgrade pip with logging
    print_info "Upgrading pip..."
    if pip install --upgrade pip 2>&1 | tee "$LOG_DIR/pip-upgrade.log" | tail -n 3; then
        print_success "pip upgraded successfully"
    else
        print_warning "pip upgrade failed (continuing anyway)"
        print_info "See log: $LOG_DIR/pip-upgrade.log"
    fi

    # Install dependencies from all skills' requirements.txt files
    print_info "Installing Python dependencies from all skills..."

    local installed_count=0
    for skill_dir in "$SCRIPT_DIR"/*; do
        if [ -d "$skill_dir" ]; then
            skill_name=$(basename "$skill_dir")

            # Skip .venv and document-skills
            if [ "$skill_name" == ".venv" ] || [ "$skill_name" == "document-skills" ]; then
                continue
            fi

            # Install main requirements.txt
            if [ -f "$skill_dir/scripts/requirements.txt" ]; then
                local SKILL_LOG="$LOG_DIR/install-${skill_name}.log"

                print_info "Installing $skill_name dependencies..."

                if pip install -r "$skill_dir/scripts/requirements.txt" 2>&1 | tee "$SKILL_LOG"; then
                    print_success "$skill_name dependencies installed successfully"
                    successful_skills+=("$skill_name")
                    installed_count=$((installed_count + 1))
                else
                    print_error "$skill_name dependencies FAILED to install"
                    print_info "Error details saved to: $SKILL_LOG"
                    print_info "Last 10 lines of error:"
                    tail -n 10 "$SKILL_LOG" | sed 's/^/  /'
                    failed_skills+=("$skill_name")
                    # Do NOT increment installed_count
                fi
            fi

            # Install test requirements.txt
            if [ -f "$skill_dir/scripts/tests/requirements.txt" ]; then
                local SKILL_TEST_LOG="$LOG_DIR/install-${skill_name}-tests.log"

                print_info "Installing $skill_name test dependencies..."

                if pip install -r "$skill_dir/scripts/tests/requirements.txt" 2>&1 | tee "$SKILL_TEST_LOG"; then
                    print_success "$skill_name test dependencies installed successfully"
                else
                    print_warning "$skill_name test dependencies failed to install"
                    print_info "Error log: $SKILL_TEST_LOG"
                    print_info "Last 10 lines:"
                    tail -n 10 "$SKILL_TEST_LOG" | sed 's/^/  /'
                    # Don't fail installation if test deps fail (less critical)
                fi
            fi
        fi
    done

    # Print installation summary
    print_header "Python Dependencies Installation Summary"

    if [ ${#successful_skills[@]} -gt 0 ]; then
        print_success "Successfully installed ${#successful_skills[@]} skill(s):"
        for skill in "${successful_skills[@]}"; do
            echo "  ✓ $skill"
        done
    fi

    if [ ${#failed_skills[@]} -gt 0 ]; then
        echo ""  # Blank line for separation
        print_error "Failed to install ${#failed_skills[@]} skill(s):"
        for skill in "${failed_skills[@]}"; do
            echo "  ✗ $skill"
        done
        echo ""
        print_info "Review error logs for details:"
        print_info "  ls $LOG_DIR/install-*.log"
        echo ""
        print_info "Common issues:"
        print_info "  - Missing C compiler (gcc/clang)"
        print_info "  - Missing Python development headers (python3-dev)"
        print_info "  - Missing system libraries (libjpeg-dev, libssl-dev, zlib1g-dev)"
        echo ""
        if [[ "$OS" == "linux" ]]; then
            print_info "Install on Debian/Ubuntu:"
            print_info "  sudo apt-get install gcc python3-dev libjpeg-dev zlib1g-dev libssl-dev"
        elif [[ "$OS" == "macos" ]]; then
            print_info "Install on macOS:"
            print_info "  xcode-select --install"
            print_info "  brew install jpeg libpng openssl"
        fi
        echo ""
        deactivate
        exit 1  # Fail if any skills failed
    elif [ ${#successful_skills[@]} -eq 0 ]; then
        print_warning "No skill requirements.txt files found"
    else
        print_success "All Python dependencies installed successfully"
    fi

    deactivate
}

# Verify installations
verify_installations() {
    print_header "Verifying Installations"

    # FFmpeg
    if command_exists ffmpeg; then
        print_success "FFmpeg is available"
    else
        print_warning "FFmpeg is not available"
    fi

    # ImageMagick (check both magick and convert - older versions use convert)
    if command_exists magick || command_exists convert; then
        print_success "ImageMagick is available"
    else
        print_warning "ImageMagick is not available"
    fi

    # Node.js & npm
    if command_exists node; then
        print_success "Node.js is available"
    else
        print_warning "Node.js is not available"
    fi

    if command_exists npm; then
        print_success "npm is available"
    else
        print_warning "npm is not available"
    fi

    declare -a npm_packages=(
        "rmbg"
        "pnpm"
        "wrangler"
        "repomix"
    )

    for package in "${npm_packages[@]}"; do
        if command_exists "$package"; then
            print_success "$package CLI is available"
        else
            print_warning "$package CLI is not available"
        fi
    done

    # Check Python packages
    if [ -d "$VENV_DIR" ]; then
        source "$VENV_DIR/bin/activate"
        if python -c "import google.genai" 2>/dev/null; then
            print_success "google-genai Python package is available"
        else
            print_warning "google-genai Python package is not available"
        fi
        deactivate
    fi
}

# Print usage instructions
print_usage() {
    print_header "Installation Complete!"

    echo -e "${GREEN}To use the Python virtual environment:${NC}"
    echo -e "  source .claude/skills/.venv/bin/activate"
    echo ""
    echo -e "${GREEN}To verify installations:${NC}"
    echo -e "  ffmpeg -version"
    echo -e "  magick -version"
    echo -e "  rmbg --version"
    echo -e "  node --version"
    echo ""
    echo -e "${GREEN}To run tests:${NC}"
    echo -e "  source .claude/skills/.venv/bin/activate"
    echo -e "  cd .claude/skills/<skill-name>/scripts"
    echo -e "  pytest tests/ -v"
    echo ""
    echo -e "${GREEN}Environment variables:${NC}"
    echo -e "  Create .claude/skills/.env for shared config"
    echo -e "  Create .claude/skills/<skill-name>/.env for skill-specific config"
    echo ""
    echo -e "${BLUE}For more information, see:${NC}"
    echo -e "  .claude/skills/INSTALLATION.md"
    echo ""
}

# Main installation flow
main() {
    echo ""  # Just add spacing, don't clear terminal
    print_header "Claude Code Skills Installation"
    print_info "OS: $OS"
    print_info "Script directory: $SCRIPT_DIR"
    echo ""

    if [[ "$OS" == "unknown" ]]; then
        print_error "Unsupported operating system"
        exit 1
    fi

    # Confirm installation (skip if --yes flag or NON_INTERACTIVE env is set)
    if [[ "$SKIP_CONFIRM" == "false" ]]; then
        read -p "This will install system packages and Node.js dependencies. Continue? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Installation cancelled"
            exit 0
        fi
    else
        print_info "Auto-confirming installation (--yes flag or NON_INTERACTIVE mode)"
    fi

    check_package_manager
    install_system_deps
    install_node_deps
    setup_python_env
    verify_installations
    print_usage
}

# Run main function
main
