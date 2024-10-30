const dropzone = document.getElementById("dropzone");
  const output = document.getElementById("output");
  const fileInput = document.getElementById("file-input");

  let files = []; // Array to store files for multi-file handling

  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("hover"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("hover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("hover");
    handleFiles(e.dataTransfer.files);
  });

  // Handle files from the input
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(droppedFiles) {
    Array.from(droppedFiles).forEach((file, index) => {
      const fileEntry = document.createElement("div");
      fileEntry.className = "file-entry";
      fileEntry.innerHTML = `
        <div class="file-header">
          <strong>${file.name}</strong>
          <div>
            <button class="btn-read" onclick="readFile(${files.length})">Read</button>
            <button class="btn-edit" onclick="editFile(${files.length})">Edit</button>
            <button class="btn-download" onclick="downloadFile(${files.length})">Download</button>
          </div>
        </div>
        <div class="file-meta">Type: ${file.type || "Unknown"}, Size: ${(file.size / 1024).toFixed(2)} KB</div>
        <div class="file-preview" id="content-${files.length}">File content will be displayed here...</div>
      `;
      output.appendChild(fileEntry);
      files.push({ file, entry: fileEntry });
    });
  }

  function readFile(index) {
    const { file } = files[index];
    const contentElement = document.getElementById(`content-${index}`);
    const reader = new FileReader();

    if (file.type.startsWith("image/")) {
      reader.onload = () => { contentElement.innerHTML = `<img src="${reader.result}" alt="${file.name}" style="max-width:100%;">`; };
      reader.readAsDataURL(file);

    } else if (file.type.startsWith("text/") || file.type === "") {
      reader.onload = () => { contentElement.innerText = reader.result; };
      reader.readAsText(file);

    } else if (file.type === "application/pdf") {
      reader.onload = () => {
        const typedArray = new Uint8Array(reader.result);
        pdfjsLib.getDocument(typedArray).promise.then((pdf) => {
          pdf.getPage(1).then((page) => {
            const viewport = page.getViewport({ scale: 1 });
            const canvas = document.createElement("canvas");
            canvas.style.maxWidth = "100%";
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            page.render({ canvasContext: context, viewport }).promise.then(() => { contentElement.appendChild(canvas); });
          });
        });
      };
      reader.readAsArrayBuffer(file);

    } else if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      reader.onload = () => {
        const workbook = XLSX.read(reader.result, { type: "binary" });
        const firstSheet = workbook.SheetNames[0];
        const excelData = XLSX.utils.sheet_to_html(workbook.Sheets[firstSheet]);
        contentElement.innerHTML = excelData;
      };
      reader.readAsBinaryString(file);

    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      reader.onload = () => {
        mammoth.extractRawText({ arrayBuffer: reader.result }).then((result) => {
          contentElement.innerText = result.value;
        }).catch((err) => {
          console.error(err);
          contentElement.innerText = "Error reading Word document.";
        });
      };
      reader.readAsArrayBuffer(file);

    } else {
      contentElement.innerText = "Unsupported file type.";
    }
  }

  function editFile(index) {
    const { file } = files[index];
    const contentElement = document.getElementById(`content-${index}`);

    if (file.type.startsWith("text/")) {
      const editArea = document.createElement("textarea");
      editArea.style.width = "100%";
      editArea.style.height = "200px";
      editArea.value = contentElement.innerText;
      contentElement.innerHTML = ""; // Clear previous content
      contentElement.appendChild(editArea);

      const saveButton = document.createElement("button");
      saveButton.innerText = "Save Changes";
      saveButton.className = "btn-download";
      saveButton.onclick = () => {
        const updatedContent = editArea.value;
        const blob = new Blob([updatedContent], { type: "text/plain" });
        const newFile = new File([blob], { name: file.name, type: file.type });
        files[index].file = newFile; // Update file in the files array
        contentElement.innerText = updatedContent; // Update display
      };
      contentElement.appendChild(saveButton);
    } else {
      alert("Editing is only available for text files.");
    }
  }

  function downloadFile(index) {
    const { file } = files[index];
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }