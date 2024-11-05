# Raw Script if you want to run the tool locally

import json

# Cleans the SBOM output by filtering out applications and gathering information about components
def clean_output_application_sbom(output: dict) -> tuple:
    results = []
    ignore_list = []
    deps = output.get("dependencies", [])
    
    # Add the metadata component's bom-ref to the ignore list
    metadata_component = output.get("metadata", {}).get("component", {})
    if metadata_component:
        bom_ref = metadata_component.get("bom-ref")
        if bom_ref:
            ignore_list.append(bom_ref)
    
    # Iterate through components and collect relevant data, skipping applications
    for item in output.get("components", []):
        if item.get("type") == "application":
            bom_ref = item.get("bom-ref")
            if bom_ref:
                ignore_list.append(bom_ref)
            continue
        
        # Extract component information
        bom_ref = item.get("bom-ref")
        name = item.get("name", "Unknown")
        version = item.get("version", "Unknown")
        licenses = extract_licenses(item.get("licenses", []))
        
        # Determine the component type
        properties = item.get("properties", [])
        component_type = "unknown"
        if len(properties) > 1:
            value = properties[1].get("value")
            if value:
                component_type = value
        
        # Append the cleaned component data to the results list
        results.append({
            "bom-ref": bom_ref,
            "name": name,
            "version": version,
            "licenses": licenses,
            "type": component_type
        })
    
    return results, deps, ignore_list

# Helper function to extract license information
def extract_licenses(licenses_list):
    licenses = []
    for lic in licenses_list:
        license_info = lic.get("license")
        if license_info:
            licenses.append({"name": license_info.get("name", "Unknown")})
    return licenses

# Converts a JSON string to a Python dictionary, handling potential errors
def convert_output(output_str: str):
    if not output_str:
        raise ValueError("Output string is empty or None.")
    try:
        return json.loads(output_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON decoding error: {e}")

# Helper function to populate metadata for a given reference
def populate_metadata(data, ref):
    for meta in data:
        bom_ref = meta.get("bom-ref")
        if ref == bom_ref:
            meta.pop("bom-ref", None)
            return meta
    return {}

# Converts CycloneDX data into a hierarchical tree graph structure
def convert_cyclonedx_to_tree(data: list, deps: list, ignore_list: list) -> tuple:
    graph = {}
    metadata = {}

    # Iterate over each dependency and add it to the graph and metadata if not ignored
    for component in deps:
        ref = component.get("ref")
        if not ref or ref in ignore_list:
            continue
        
        # Populate metadata with information from data list using helper function
        metadata[ref] = populate_metadata(data, ref)
        
        # Initialize the graph for the component if not already present
        if ref not in graph:
            graph[ref] = {"dependsOn": []}
        
        # Add dependencies for the current component
        depends_on = component.get("dependsOn", [])
        graph[ref]["dependsOn"].extend(depends_on)
    return graph, metadata

# Recursively builds the hierarchical tree, tracking visited nodes to avoid circular dependencies
def recursive_hierarchy(graph, metadata, node, visited, depth=0, max_depth=50):
    # Check for circular dependency
    if node in visited:
        return {"ref": node, "error": f"circular dependency detected at {node}. Path: {list(visited)}", "deps": []}
    
    # Check for exceeding the maximum recursion depth
    if depth > max_depth:
        return {"ref": node, "error": "recursion depth limit reached", "deps": []}
    
    # Mark the node as visited
    visited.add(node)
    children = graph.get(node, {}).get("dependsOn", [])
    node_metadata = metadata.get(node, {})

    # If no children, return the node with its metadata
    if not children:
        return {"ref": node, **node_metadata, "deps": []}

    # Recursively build the hierarchy for each child
    return {
        "ref": node,
        **node_metadata,
        "deps": [recursive_hierarchy(graph, metadata, child, visited.copy(), depth + 1) for child in children]
    }

# Identifies root nodes (nodes that are not dependencies of any other node)
def root_nodes(hierarchical_tree_graph):
    roots = []
    inverse_dependencies = set()

    # Build a set of all nodes that are dependencies
    for node in hierarchical_tree_graph[0].values():
        inverse_dependencies.update(node.get("dependsOn", []))
    
    # Root nodes are those not found in the set of dependencies
    for node in hierarchical_tree_graph[0]:
        if node not in inverse_dependencies:
            roots.append(node)
    
    return roots

# Writes the hierarchical tree to a JSON file
def write_tree_to_json(hierarchical_tree, output_file):
    json_data = json.dumps(hierarchical_tree, indent=2)
    with open(output_file, "w") as f:
        f.write(json_data)
    print(f"JSON data written to {output_file}")

# Main parsing function to process the SBOM and generate the hierarchical tree
def parser(output):
    # Convert the output string to a dictionary
    try:
        output = convert_output(output)
    except ValueError as e:
        print(f"Error: {e}")
        return
    
    # Clean the output to extract relevant data
    data, deps, ignore_list = clean_output_application_sbom(output)
    # Convert the data to a hierarchical tree graph
    hierarchical_tree_graph = convert_cyclonedx_to_tree(data, deps, ignore_list)
    # Identify the root nodes
    roots = root_nodes(hierarchical_tree_graph)
    print(f'root nodes: {roots}')
    
    if not roots:
        print("No root nodes found. Possible circular dependency or incomplete data.")
    
    # Build the hierarchical tree starting from each root node
    hierarchical_tree = [recursive_hierarchy(hierarchical_tree_graph[0], hierarchical_tree_graph[1], root, set()) for root in roots]
    
    # Include error handling output if no roots were found or partial tree was generated
    if not hierarchical_tree:
        hierarchical_tree = [{"error": "No valid root nodes found or circular dependencies detected."}]
    
    # Write the resulting tree to a JSON file
    write_tree_to_json(hierarchical_tree, "dependency_tree_output.json")

# Attempt to read the input file and parse it
try:
    with open('cycloneDX_SBOM.json', 'r') as file:
        output_str = file.read()
    parser(output_str)
except FileNotFoundError:
    print("Error: The file 'cycloneDX_SBOM.json' was not found.")
