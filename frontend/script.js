const API_URL = "http://127.0.0.1:5000/api/parse";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPE = "application/json";

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message visible';
    errorDiv.textContent = message;
    
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    document.getElementById('file-upload-area').appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function validateFile(file) {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // Check file type
    if (file.type !== ALLOWED_FILE_TYPE) {
        throw new Error('Only JSON files are allowed');
    }

    return true;
}

async function validateJSON(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        
        // Add any specific JSON structure validation here
        if (!Array.isArray(parsed) && typeof parsed !== 'object') {
            throw new Error('Invalid JSON structure');
        }

        // Sanitize the JSON to prevent XSS
        const sanitized = JSON.parse(JSON.stringify(parsed));
        return sanitized;
    } catch (error) {
        throw new Error('Invalid JSON content: ' + error.message);
    }
}

async function uploadFile() {
    const fileInput = document.getElementById("file-input");
    const progressIndicator = document.getElementById("progress-indicator");
    const visualizationContainer = document.getElementById("visualization-container");

    try {
        // Check if a file is selected
        if (!fileInput.files || !fileInput.files.length) {
            throw new Error("Please select a file first.");
        }

        const file = fileInput.files[0];
        validateFile(file);

        // Show progress indicator
        progressIndicator.classList.remove("hidden");

        // Read and validate file content
        const fileContent = await file.text();
        const jsonContent = await validateJSON(fileContent);

        // Send the parsed JSON to the server
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest" // CSRF protection
            },
            body: JSON.stringify(jsonContent),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        // Parse the response and render the tree data
        const treeData = await response.json();
        document.getElementById("json-output").textContent = JSON.stringify(treeData, null, 2);
        
        // Show visualization container
        visualizationContainer.classList.remove("hidden");
        
        // Show trees tab by default
        showTab('trees');
        
        // Render trees after a short delay
        setTimeout(() => {
            renderMultipleTrees(treeData);
        }, 100);

    } catch (error) {
        showError(error.message);
    } finally {
        progressIndicator.classList.add("hidden");
    }
}

function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach(content => {
        content.classList.remove("active");
        content.classList.add("hidden");
    });

    // Remove active class from all tab buttons
    document.querySelectorAll(".tab-button").forEach(button => {
        button.classList.remove("active");
    });

    // Show selected tab content and activate its button
    const selectedTab = document.getElementById(`${tabName}-container`);
    const selectedButton = document.querySelector(`button[onclick="showTab('${tabName}')"]`);
    
    selectedTab.classList.remove("hidden");
    selectedTab.classList.add("active");
    selectedButton.classList.add("active");
}

function downloadOutput() {
  const jsonOutput = document.getElementById("json-output").textContent;

  // Check if there is output to download
  if (!jsonOutput) {
    alert("No output to download.");
    return;
  }

  // Create a Blob from the JSON output and trigger download
  const blob = new Blob([jsonOutput], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dependency_tree_output.json";
  a.click();

  // Release the object URL
  URL.revokeObjectURL(url);
}

// Trigger file input click when the drag-drop area is clicked
document.getElementById("drag-drop-area").addEventListener("click", () => {
  document.getElementById("file-input").click();
});

// Update drag-drop area text with the selected file name
document.getElementById("file-input").addEventListener("change", (event) => {
  if (event.target.files && event.target.files.length > 0) {
    document.getElementById("drag-drop-area").textContent = `Selected File: ${event.target.files[0].name}`;
  }
});

function transformDataForD3(node) {
  if (!node) return null;

  // Convert "deps" key to "children" and rename "ref" to "name" if necessary
  let transformedNode = {
    ...node,
    name: node.name || node.ref,
    children: node.deps ? node.deps.map(transformDataForD3) : [],
  };

  // Remove unnecessary keys
  delete transformedNode.deps;
  delete transformedNode.ref;

  return transformedNode;
}

function renderMultipleTrees(treesData) {
  const treesContainer = document.getElementById("trees-container");
  if (!treesContainer) {
    console.error("Trees container not found");
    return;
  }

  treesContainer.innerHTML = ""; // Clear any previous trees

  // Add a check for treesData
  if (!Array.isArray(treesData)) {
    console.error("Invalid trees data format");
    return;
  }

  treesData.forEach((tree, index) => {
    const treeSection = createTreeContainer(tree, index);
    treesContainer.appendChild(treeSection);

    // Small delay to ensure DOM is updated
    setTimeout(() => {
      const transformedTree = transformDataForD3(tree);
      renderTree(transformedTree, `tree-container-${index}`);
    }, 50);
  });
}

function createTreeContainer(tree, index) {
  // Create container for each individual tree
  const treeSection = document.createElement("div");
  treeSection.classList.add("tree-section");

  const rootLibraryName = tree.name || `Tree ${index + 1}`;
  const treeHeader = document.createElement("h2");
  treeHeader.classList.add("tree-header");
  treeHeader.textContent = `Dependency Tree: ${rootLibraryName}`;

  const treeContainer = document.createElement("div");
  treeContainer.classList.add("tree-container");
  treeContainer.id = `tree-container-${index}`;

  treeSection.appendChild(treeHeader);
  treeSection.appendChild(treeContainer);

  return treeSection;
}

function renderTree(data, containerId) {
  const treeContainer = document.getElementById(containerId);
  if (!treeContainer) {
    console.error(`Container ${containerId} not found`);
    return;
  }

  // Wait for container to have dimensions
  if (!treeContainer.clientWidth || !treeContainer.clientHeight) {
    setTimeout(() => renderTree(data, containerId), 50);
    return;
  }

  treeContainer.innerHTML = ""; // Clear any previous tree

  const margin = { top: 20, right: 20, bottom: 120, left: 20 };
  const width = treeContainer.clientWidth - margin.left - margin.right || 600;
  const height = treeContainer.clientHeight - margin.top - margin.bottom || 400;

  // Create an SVG element with appropriate margins
  const svg = d3.select(`#${containerId}`).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const root = d3.hierarchy(data);

  // Define the tree layout and set its size
  const treeLayout = d3.tree().size([width, height]);
  treeLayout(root);

  // Create links between nodes
  svg.selectAll(".link")
    .data(root.links())
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.linkVertical()
      .x((d) => d.x)
      .y((d) => d.y))
    .style("fill", "none")
    .style("stroke", "#bb86fc")
    .style("stroke-width", 1.5);

  // Create nodes with labels
  const nodes = svg.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x},${d.y})`);

  nodes.each(function (d) {
    const labelText = d.data.name;

    // Create a temporary text element to calculate its width
    const tempText = d3.select(this)
      .append("text")
      .style("font", "12px Arial")
      .text(labelText)
      .style("visibility", "hidden");

    const textWidth = tempText.node().getComputedTextLength();

    // Remove the temporary text element after measurement
    tempText.remove();

    // Append rectangle with appropriate dimensions
    d3.select(this)
      .append("rect")
      .attr("width", textWidth + 20)
      .attr("height", 30)
      .attr("x", -(textWidth / 2) - 10)
      .attr("y", -15)
      .style("fill", "#bb86fc")
      .style("stroke", "#e0e0e0")
      .style("stroke-width", 1.5)
      .style("rx", 5)
      .style("ry", 5);

    // Append the text inside the rectangle
    d3.select(this)
      .append("text")
      .attr("dy", 8)
      .attr("x", 0)
      .style("text-anchor", "middle")
      .style("fill", "#ffffff")
      .style("font-weight", "bold")
      .text(labelText);
  });
}