const TIME = /^\d{2}:\d{2}:\d{2}\.\d{6}$/;
let history = [],
  future = [];
let splitToolHistory = JSON.parse(
  localStorage.getItem("libresplit-splits") ||
    '{"title":"","width":250,"height":500,"splits":[]}',
);

function snapshot() {
  history.push(JSON.stringify(splitToolHistory));
  future = [];
}

function save() {
  localStorage.setItem("libresplit-splits", JSON.stringify(splitToolHistory));
  render();
}

function undo() {
  if (!history.length) return;
  future.push(JSON.stringify(splitToolHistory));
  splitToolHistory = JSON.parse(history.pop());
  save();
}

function redo() {
  if (!future.length) return;
  history.push(JSON.stringify(splitToolHistory));
  splitToolHistory = JSON.parse(future.pop());
  save();
}

function render() {
  title.value = splitToolHistory.title || "";
  attempt_count.value = splitToolHistory.attempt_count ?? "";
  start_delay.value = splitToolHistory.start_delay ?? "";
  world_record.value = splitToolHistory.world_record ?? "";
  width.value = splitToolHistory.width ?? 250;
  height.value = splitToolHistory.height ?? 500;

  const c = document.getElementById("splits");
  c.innerHTML = "";
  splitToolHistory.splits.forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "split";
    d.draggable = true;
    d.innerHTML = `<div class="split-header">
<input class="split-title" value="${(s.title || "").replace(/"/g, "&quot;")}" onchange="updateSplit(${i},'title',this.value)">
<button onclick="toggleDetails(${i})">${s.expanded ? "Hide" : "Details"}</button>
<button onclick="deleteSplit(${i})">✕</button></div>
<div class="details" style="display:${s.expanded ? "block" : "none"}">
<label>Icon<input value="${s.icon || ""}" onchange="updateSplit(${i},'icon',this.value)"></label>
<label>Time<input value="${s.time || ""}" onchange="updateSplit(${i},'time',this.value)"></label>
<label>Best Time<input value="${s.best_time || ""}" onchange="updateSplit(${i},'best_time',this.value)"></label>
<label>Best Segment<input value="${s.best_segment || ""}" onchange="updateSplit(${i},'best_segment',this.value)"></label></div>`;
    d.addEventListener("dragstart", (e) =>
      e.dataTransfer.setData("text/plain", i),
    );
    d.addEventListener("dragover", (e) => e.preventDefault());
    d.addEventListener("drop", (e) => {
      e.preventDefault();
      snapshot();
      const from = +e.dataTransfer.getData("text/plain");
      const item = splitToolHistory.splits.splice(from, 1)[0];
      splitToolHistory.splits.splice(i, 0, item);
      save();
    });
    c.appendChild(d);
  });
  document.getElementById("preview").textContent = JSON.stringify(
    cleanProject(splitToolHistory),
    null,
    2,
  );
}

function toggleDetails(i) {
  splitToolHistory.splits[i].expanded = !splitToolHistory.splits[i].expanded;
  save();
}

function updateSplit(i, key, value) {
  snapshot();
  value = value.trim();
  if (["time", "best_time", "best_segment"].includes(key)) {
    if (value === "") {
      delete splitToolHistory.splits[i][key];
      save();
      return;
    }
    if (!TIME.test(value)) {
      alert("Use HH:MM:SS.mmmmmm");
      return;
    }
  }

  if (key === "icon" && value === "") {
    delete splitToolHistory.splits[i].icon;
    save();
    return;
  }

  splitToolHistory.splits[i][key] = value;
  save();
}

function addSplit() {
  snapshot();
  splitToolHistory.splits.push({ title: "New Split" });
  save();
}

function deleteSplit(i) {
  snapshot();
  splitToolHistory.splits.splice(i, 1);
  save();
}

[
  "title",
  "attempt_count",
  "start_delay",
  "world_record",
  "width",
  "height",
].forEach((id) => {
  document.getElementById(id).addEventListener("change", (e) => {
    snapshot();
    const v = e.target.value.trim();
    if (id === "attempt_count" && v === "") {
      delete splitToolHistory.attempt_count;
      save();
      return;
    }
    if ((id === "start_delay" || id === "world_record") && v === "") {
      delete splitToolHistory[id];
      save();
      return;
    }
    splitToolHistory[id] = ["attempt_count", "width", "height"].includes(id)
      ? Number(v)
      : v;
    save();
  });
});

function cleanProject(src) {
  const out = JSON.parse(JSON.stringify(src));
  if (out.attempt_count === undefined) delete out.attempt_count;
  if (!out.start_delay) delete out.start_delay;
  if (!out.world_record) delete out.world_record;
  out.splits = out.splits.map((split) => {
    const splitObj = { title: split.title || "" };
    if (split.icon) splitObj.icon = s.icon;
    if (split.time) splitObj.time = s.time;
    if (split.best_time) splitObj.best_time = s.best_time;
    if (split.best_segment) splitObj.best_segment = s.best_segment;
    return splitObj;
  });
  return out;
}

async function loadLibreSplitFile(file) {
  const text = await file.text();
  const json = JSON.parse(text);
  if (!Array.isArray(json.splits)) throw new Error("Invalid LibreSplit file");
  snapshot();
  splitToolHistory = json;
  save();
}

function exportFile() {
  const output = cleanProject(splitToolHistory);
  if (!output.title) {
    alert("Title is required!");
    return;
  }

  const blob = new Blob([JSON.stringify(output, null, 4)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (output.title || "splits") + ".json";
  a.click();
}

const dropZone = document.getElementById("dropZone");
dropZone.addEventListener("dragover", (e) => e.preventDefault());
dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  try {
    let file = null;
    if (e.dataTransfer.items) {
      for (const item of e.dataTransfer.items) {
        if (item.kind === "file") {
          file = item.getAsFile();
          break;
        }
      }
    }
    if (!file && e.dataTransfer.files && e.dataTransfer.files.length) {
      file = e.dataTransfer.files[0];
    }
    if (!file) throw new Error("No file");
    await loadLibreSplitFile(file);
  } catch (err) {
    console.error(err);
    alert("Invalid LibreSplit file");
  }
});

document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await loadLibreSplitFile(file);
  } catch (err) {
    console.error(err);
    alert("Invalid LibreSplit file");
  }
});

window.exportFile = exportFile;
window.undo = undo;
window.redo = redo;
window.addSplit = addSplit;
window.deleteSplit = deleteSplit;
window.updateSplit = updateSplit;
window.toggleDetails = toggleDetails;
render();
