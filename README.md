# CycloneDX SBOM to Dependency Tree Generator

## Overview
This project provides a Python script that generates a hierarchical tree representation of dependencies from a CycloneDX Software Bill of Materials (SBOM). It takes a CycloneDX JSON file as input, parses the components and their dependencies, and generates a JSON file representing the dependency tree in a hierarchical format.

## Features
- **CycloneDX SBOM Parsing**: Parses the CycloneDX JSON format, a popular standard for representing software dependencies.
- **Graph and DFS Traversal**: Builds a graph representation of the components and uses Depth-First Search (DFS) to create a hierarchical dependency tree.
- **Circular Dependency Detection**: Identifies circular dependencies and reports them as errors.
- **JSON Output**: Outputs the final hierarchical tree of dependencies in JSON format for easy visualization and integration.

## Project Structure
- **`main.py`**: The main script that processes the CycloneDX SBOM and generates the hierarchical JSON file.
- **`cycloneDX_SBOM.json`**: A sample CycloneDX SBOM file with components and dependencies that can be used to test the script.
- **`hierarchical_tree.json`**: The output file containing the hierarchical tree representation of the dependencies.

## Prerequisites
- Python 3.x
- CycloneDX SBOM in JSON format (e.g., `cycloneDX_SBOM.json`)

## Installation
1. Clone this repository:
   ```bash
   git clone <repository_url>
   cd <repository_directory>
   ```
2. Ensure Python 3.x is installed on your system.

## Usage
1. Place the CycloneDX SBOM file (`cycloneDX_SBOM.json`) in the project directory.
2. Run the script with Python:
   ```bash
   python main.py
   ```
   The script will read the SBOM, parse the dependencies, and output a file named `hierarchical_tree.json`.

## How It Works
1. **Parsing the Input**: The script reads the CycloneDX JSON file and extracts components, metadata, and dependencies.
2. **Graph Representation**: The components are represented as nodes, and dependencies are represented as edges.
3. **Depth-First Search (DFS)**: Uses a recursive DFS approach to traverse the dependency graph, creating a hierarchical tree of dependencies.
4. **Circular Dependency Handling**: Detects circular dependencies during the DFS traversal and prevents infinite loops by maintaining a set of visited nodes.
5. **Output Generation**: Generates the hierarchical tree as a JSON file (`hierarchical_tree.json`) that represents the relationships between components.

## Example
The provided `cycloneDX_SBOM.json` contains the following example:
- A root component (`Test Application`) with multiple dependencies.
- Components with their own sub-dependencies, forming a complex graph structure.
- Circular dependency detection and hierarchical output.

## Key Concepts
- **Graph Representation**: Components and dependencies are represented as nodes and edges.
- **Depth-First Search (DFS)**: The DFS algorithm is used to traverse the dependency graph to build a tree structure.
- **JSON Input and Output**: Input is provided as a CycloneDX JSON file, and output is generated as a hierarchical JSON file.

## Example Output
Here is an example of what the output `hierarchical_tree.json` might look like:
```json
[
  {
    "ref": "root-component",
    "name": "Test Application",
    "version": "1.0.0",
    "deps": [
      {
        "ref": "component-1",
        "name": "Library A",
        "version": "2.0.0",
        "deps": [
          {
            "ref": "component-3",
            "name": "Library C",
            "version": "3.1.0",
            "deps": [
              {
                "ref": "component-5",
                "name": "Library E",
                "version": "1.0.0",
                "deps": []
              }
            ]
          },
          {
            "ref": "component-4",
            "name": "Library D",
            "version": "4.0.0",
            "deps": []
          }
        ]
      },
      {
        "ref": "component-2",
        "name": "Library B",
        "version": "1.5.0",
        "deps": [
          {
            "ref": "component-4",
            "name": "Library D",
            "version": "4.0.0",
            "deps": []
          }
        ]
      }
    ]
  }
]
```

## Potential Improvements
- **Error Handling**: Implement more comprehensive error handling for malformed JSON files.
- **Command-Line Arguments**: Add support for specifying input/output files via command-line arguments.
- **Iterative DFS**: Convert the recursive DFS to an iterative version to prevent stack overflow on deeply nested graphs.

## Contributing
Feel free to submit issues and pull requests for new features, bug fixes, or improvements.