// Constants
const API_URL = "https://dependency-tree-techzon.pythonanywhere.com/api/parse";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit for file upload
const ALLOWED_FILE_TYPE = "application/json";

//==========================================
// Utility Functions
//==========================================

// Display an error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message visible';
  errorDiv.textContent = message;

  // Remove existing error if present
  const existingError = document.querySelector('.error-message');
  if (existingError) {
      existingError.remove();
  }

  document.getElementById('file-upload-area').appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000); // Remove error after 5 seconds
}

// Validate uploaded file (size and type)
function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }
  if (file.type !== ALLOWED_FILE_TYPE) {
    throw new Error('Only JSON files are allowed');
  }
  return true;
}

// Validate and sanitize JSON content
async function validateJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed) && typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure');
    }
    return JSON.parse(JSON.stringify(parsed)); // Sanitize the JSON
  } catch (error) {
    throw new Error('Invalid JSON content: ' + error.message);
  }
}

//==========================================
// File Upload and Visualization Functions
//==========================================

// Upload file and process the content
async function uploadFile() {
  const fileInput = document.getElementById("file-input");
  const progressIndicator = document.getElementById("progress-indicator");
  const visualizationSection = document.getElementById("visualization-section");

  try {
    if (!fileInput.files?.length) {
      throw new Error("Please select a file first.");
    }

    const file = fileInput.files[0];
    validateFile(file);

    // Show progress indicator
    progressIndicator.classList.add('visible');

    const fileContent = await file.text();
    const jsonContent = await validateJSON(fileContent);

    // Send the JSON content to the backend API
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify(jsonContent),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const treeData = await response.json();

    // Update UI with results
    document.getElementById("json-output").textContent = JSON.stringify(treeData, null, 2);
    
    // Show visualization section after successful upload
    visualizationSection.style.display = 'block';
    showTab('trees');
    
    requestAnimationFrame(() => {
      renderMultipleTrees(treeData);
    });

  } catch (error) {
    showError(error.message);
  } finally {
    // Hide progress indicator
    progressIndicator.classList.remove('visible');
  }
}

//==========================================
// Tab Handling
//==========================================

// Show the selected tab (either trees or JSON output)
function showTab(tabName) {
  // Only proceed if visualization section is visible
  if (document.getElementById("visualization-section").style.display === 'none') {
    return;
  }

  // Hide all content and deactivate all buttons
  document.querySelectorAll(".tab-content").forEach(content => {
    content.style.display = 'none';
  });
  document.querySelectorAll(".tab-button").forEach(button => {
    button.classList.remove("active");
  });

  // Show selected content and activate button
  const selectedTab = document.getElementById(`${tabName}-container`);
  const selectedButton = document.querySelector(`button[onclick="showTab('${tabName}')"]`);

  if (selectedTab && selectedButton) {
    selectedTab.style.display = 'block';
    selectedButton.classList.add("active");
  }
}

//==========================================
// Event Listeners
//==========================================

// Initialize event listeners for file upload, drag and drop
function initializeEventListeners() {
  const dragDropArea = document.getElementById("drag-drop-area");
  const fileInput = document.getElementById("file-input");

  fileInput?.addEventListener("change", async (event) => {
    if (event.target.files?.length > 0) {
      dragDropArea.textContent = `Selected File: ${event.target.files[0].name}`;
      await uploadFile();
    }
  });

  // Drag and drop handlers
  dragDropArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragDropArea.classList.add('drag-over');
  });

  dragDropArea?.addEventListener('dragleave', () => {
    dragDropArea.classList.remove('drag-over');
  });

  dragDropArea?.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragDropArea.classList.remove('drag-over');

    if (e.dataTransfer?.files.length) {
      fileInput.files = e.dataTransfer.files;
      dragDropArea.textContent = `Selected File: ${e.dataTransfer.files[0].name}`;
      await uploadFile();
    }
  });

  dragDropArea?.addEventListener('click', () => {
    fileInput?.click();
  });
}

// Initialize listeners when DOM is ready
document.addEventListener('DOMContentLoaded', initializeEventListeners);

//==========================================
// JSON Download Functionality
//==========================================

// Download the JSON output as a file
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

//==========================================
// Tree Rendering for Visualization
//==========================================

// Transform the data for D3 visualization
function transformDataForD3(node) {
  if (!node) return null;

  // Convert "deps" key to "children" and rename "ref" to "name" if necessary
  let transformedNode = {
    ...node,
    name: node.error || node.name || node.ref,
    children: node.deps ? node.deps.map(transformDataForD3) : [],
  };

  // Remove unnecessary keys
  delete transformedNode.deps;
  delete transformedNode.ref;

  return transformedNode;
}

// Render multiple trees for visualization
function renderMultipleTrees(treesData) {
  const treesContainer = document.getElementById("trees-container");
  if (!treesContainer) {
    console.error("Trees container not found");
    return;
  }

  treesContainer.innerHTML = ""; // Clear any previous trees

  // Check if treesData is valid
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

// Create container for each individual tree
function createTreeContainer(tree, index) {
  const treeSection = document.createElement("div");
  treeSection.classList.add("tree-section");

  const rootLibraryName = tree.name || `Tree ${index + 1}`;
  const treeHeader = document.createElement("h2");
  treeHeader.classList.add("tree-header");
  treeHeader.textContent = `Library: ${rootLibraryName}`;

  const treeContainer = document.createElement("div");
  treeContainer.classList.add("tree-container");
  treeContainer.id = `tree-container-${index}`;

  treeSection.appendChild(treeHeader);
  treeSection.appendChild(treeContainer);

  return treeSection;
}

// Render a tree using D3.js
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

  // Append the text and rectangle together
  nodes.each(function (d) {
    const nodeGroup = d3.select(this);

    // Append text to the node
    const text = nodeGroup.append("text")
      .attr("dy", 4)  // Adjust the vertical alignment
      .attr("x", 0)
      .style("text-anchor", "middle")
      .style("fill", "#ffffff")
      .style("font-weight", "bold")
      .style("font", "12px Arial")
      .text(d => d.data.name);

    // Use bounding box to set the size of the rectangle
    const bbox = text.node().getBBox();

    // Append rectangle with calculated dimensions
    nodeGroup.insert("rect", "text")
      .attr("x", -bbox.width / 2 - 10)  // Center the rectangle with padding
      .attr("y", -bbox.height / 2 - 5)  // Center vertically with padding
      .attr("width", bbox.width + 20)  // Add padding
      .attr("height", bbox.height + 10)  // Add padding
      .style("fill", "#bb86fc")
      .style("stroke", "#e0e0e0")
      .style("stroke-width", 1.5)
      .style("rx", 5)
      .style("ry", 5);
  });
}
