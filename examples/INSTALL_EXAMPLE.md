# Install Example Directive (SudoLang)

```sudolang
# Directive for setting up and installing After Effects AI examples
# Usage: "Follow INSTALL_EXAMPLE for [example_name]"

Directive InstallExample(example_name) {
  State {
    project_root = exec("git rev-parse --show-toplevel")
    example_path = path.join(project_root, "examples", example_name)
    required_commands = ["npm", "git"]
  }

  # 1. Environment Validation
  Precondition {
    verify_directory_exists(example_path)
    verify_file_exists(path.join(example_path, "package.json"))
  }

  # 2. Installation Sequence
  Sequence Install {
    Log("Installing example: $example_name")
    
    Step ChangeDir {
      cd(example_path)
    }

    Step Dependencies {
      Run "npm install --silent"
    }

    Step Symlink {
      # Links the extension to the Adobe CEP extensions folder
      Run "npm run symlink"
    }

    Step Build {
      # Compiles TypeScript/Svelte into the dist/ folder
      Run "npm run build"
    }
  }

  # 3. Post-Install Verification
  Postcondition {
    dist_path = path.join(example_path, "dist")
    verify_directory_exists(dist_path)
    verify_file_exists(path.join(dist_path, "main/index.html"))
    
    Log("Success: $example_name is ready for After Effects.")
    Log("Instruction: Restart AE and look for '$example_name' in Window > Extensions.")
  }

  # Error Handling
  OnError(error) {
    Log("Installation failed for $example_name: $error")
    Suggest("Ensure Node.js is installed and you have permissions for the extensions folder.")
  }
}
```
