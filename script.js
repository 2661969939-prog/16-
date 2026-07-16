const databaseKey = "ovaryPlatformCases";
const databaseVersionKey = "ovaryPlatformCasesVersion";
const databaseVersion = "cases-v5-neutral-case-id";
const userProfileKey = "ovaryPlatformUserProfile";
const userHistoryKey = "ovaryPlatformUserHistory";
const defaultUserProfile = {
  username: "管理员",
  contact: "管理员",
  phone: "13800000000",
  organization: "牵头中心",
  department: "超声医学科",
  title: "主任医师",
  role: "平台管理员",
  password: "12345678",
  avatar: "",
};
const defaultCases = [
  { id: "CASE-2026-001", name: "病例一", age: 42, org: "牵头中心", part: "卵巢", status: "待初审", progress: 30, diagnosis: "卵巢囊性包块待评估", hidden: false },
  { id: "CASE-2026-002", name: "病例二", age: 45, org: "牵头中心", part: "卵巢", status: "待初审", progress: 45, diagnosis: "卵巢占位性质待查", hidden: false },
  { id: "CASE-2026-003", name: "病例三", age: 39, org: "协作中心", part: "附件区", status: "待初审", progress: 52, diagnosis: "附件区囊实性包块", hidden: false },
  { id: "CASE-2026-004", name: "病例四", age: 51, org: "区域分中心", part: "卵巢", status: "待初审", progress: 38, diagnosis: "影像资料待补充", hidden: false },
  { id: "CASE-2026-005", name: "病例五", age: 57, org: "牵头中心", part: "盆腔", status: "待初审", progress: 60, diagnosis: "术后病理结果复核", hidden: false },
  { id: "CASE-2026-006", name: "病例六", age: 48, org: "协作中心", part: "卵巢", status: "待初审", progress: 25, diagnosis: "卵巢实性结节待查", hidden: false },
];

function loadCases() {
  try {
    if (localStorage.getItem(databaseVersionKey) !== databaseVersion) {
      localStorage.setItem(databaseVersionKey, databaseVersion);
      localStorage.setItem(databaseKey, JSON.stringify(defaultCases));
      return structuredClone(defaultCases);
    }
    const saved = JSON.parse(localStorage.getItem(databaseKey) || "[]");
    return Array.isArray(saved) && saved.length ? saved : structuredClone(defaultCases);
  } catch {
    return structuredClone(defaultCases);
  }
}

let cases = loadCases();
cases.forEach((item) => {
  item.uploads = item.uploads || [];
});
if (!cases.length) cases = structuredClone(defaultCases);
const scanTypes = {
  gray: {
    title: "灰阶超声",
    note: "支持 JPEG、JPG、PNG、DICOM/DCM、AVI；DICOM/DCM 自动转换 JPG 预览，AVI 作为动态视频归档。",
    empty: "暂无灰阶超声",
  },
  color: {
    title: "彩色多普勒超声",
    note: "需保留血流显示区域，支持 JPEG、JPG、PNG、DICOM/DCM、AVI 上传。",
    empty: "暂无彩色多普勒超声",
  },
  spectrum: {
    title: "频谱多普勒超声",
    note: "建议上传包含测量值、采样门位置和速度曲线的图像或 AVI 动态资料。",
    empty: "暂无频谱多普勒超声",
  },
  threeD: {
    title: "三维超声",
    note: "可上传三维超声及三维彩色多普勒超声图像、DICOM/DCM 或 AVI 资料。",
    empty: "暂无三维超声",
  },
  contrast: {
    title: "超声造影",
    note: "可上传造影关键帧、DICOM/DCM 或 AVI 动态视频，按超声造影分类归档。",
    empty: "暂无超声造影",
  },
  elastography: {
    title: "弹性成像",
    note: "可上传弹性成像静态图、DICOM/DCM 或 AVI 动态资料。",
    empty: "暂无弹性成像",
  },
};

function getImageCategories() {
  return Object.keys(scanTypes);
}

let selectedCase = cases[0];
let activeStatus = "待初审";
let activeScan = "gray";
let uploadTarget = "超声图像";
let uploadCategory = "gray";
let caseCounter = Math.max(6, ...cases.map((item) => Number(String(item.id).match(/(\d+)$/)?.[1] || 0)));
let uploadCounter = 0;
const selectedIds = new Set();
const selectedUploadIds = new Set();

const rows = document.querySelector("#caseRows");
const statusCards = document.querySelectorAll(".status-card");
const fileInput = document.querySelector("#fileInput");
const imageGrid = document.querySelector("#imageGrid");
const uploadZone = document.querySelector("#uploadZone");
const uploadList = document.querySelector("#uploadList");
const reportAllFiles = document.querySelector("#reportAllFiles");
const caseSelector = document.querySelector("#caseSelector");
const uploadCaseSelector = document.querySelector("#uploadCaseSelector");
const reportCaseSelector = document.querySelector("#reportCaseSelector");
const reportTotalCount = document.querySelector("#reportTotalCount");
const reportPatientSummary = document.querySelector("#reportPatientSummary");
const reportFileContainers = {
  lab: document.querySelector("#labFiles"),
  pathology: document.querySelector("#pathologyFiles"),
  ct: document.querySelector("#ctFiles"),
  other: document.querySelector("#otherFiles"),
  followup: document.querySelector("#followupFiles"),
};
const uploadLibraryMeta = document.querySelector("#uploadLibraryMeta");
const homePendingReview = document.querySelector("#homePendingReview");
const homePendingQc = document.querySelector("#homePendingQc");
const homeMissingReports = document.querySelector("#homeMissingReports");
const homeMessageHint = document.querySelector("#homeMessageHint");
const imageQcNodes = {
  grayCount: document.querySelector("#qcGrayCount"),
  colorCount: document.querySelector("#qcColorCount"),
  spectrumCount: document.querySelector("#qcSpectrumCount"),
  threeDCount: document.querySelector("#qcThreeDCount"),
  grayStatus: document.querySelector("#qcGrayStatus"),
  colorStatus: document.querySelector("#qcColorStatus"),
  spectrumStatus: document.querySelector("#qcSpectrumStatus"),
  threeDStatus: document.querySelector("#qcThreeDStatus"),
  contrastCount: document.querySelector("#qcContrastCount"),
  elastographyCount: document.querySelector("#qcElastographyCount"),
  contrastStatus: document.querySelector("#qcContrastStatus"),
  elastographyStatus: document.querySelector("#qcElastographyStatus"),
  total: document.querySelector("#qcImageTotal"),
  pending: document.querySelector("#qcPendingTotal"),
  dicom: document.querySelector("#qcDicomTotal"),
};
const selectedCount = document.querySelector("#selectedCount");
const selectAllCases = document.querySelector("#selectAllCases");
const partFilter = document.querySelector("#partFilter");
const orgFilter = document.querySelector("#orgFilter");
const hiddenFilter = document.querySelector("#hiddenFilter");
const keywordInput = document.querySelector("#keywordInput");
const queryButton = document.querySelector("#queryButton");
const resetButton = document.querySelector("#resetButton");
const querySummary = document.querySelector("#querySummary");
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");
const authGate = document.querySelector("#authGate");
const authLoginForm = document.querySelector("#authLoginForm");
const authRegisterForm = document.querySelector("#authRegisterForm");
const tciaUserName = document.querySelector("#tciaUserName");
const tciaUserAvatar = document.querySelector("#tciaUserAvatar");
const tciaLogoutButton = document.querySelector("#tciaLogoutButton");
const tciaProfileTrigger = document.querySelector("#tciaProfileTrigger");
const tciaUserTextButton = document.querySelector("#tciaUserTextButton");
const sendSmsCodeButton = document.querySelector("#sendSmsCode");
let queryApplied = false;
let activeQuery = "";
let authenticated = false;
let currentUserProfile = loadUserProfile();
let pendingSmsCode = "";

function loadUserProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(userProfileKey) || "null");
    return saved ? { ...defaultUserProfile, ...saved } : { ...defaultUserProfile };
  } catch {
    return { ...defaultUserProfile };
  }
}

function saveUserProfile() {
  localStorage.setItem(userProfileKey, JSON.stringify(currentUserProfile));
}

function addUserHistory(type, detail) {
  try {
    const list = JSON.parse(localStorage.getItem(userHistoryKey) || "[]");
    list.unshift({
      type,
      detail,
      time: new Date().toLocaleString("zh-CN"),
    });
    localStorage.setItem(userHistoryKey, JSON.stringify(list.slice(0, 30)));
  } catch {
    // History is helpful but noncritical.
  }
}

function getUserHistory() {
  try {
    return JSON.parse(localStorage.getItem(userHistoryKey) || "[]");
  } catch {
    return [];
  }
}

function setCurrentUser(profile) {
  if (typeof profile === "string") {
    currentUserProfile = { ...currentUserProfile, username: profile || "管理员", contact: profile || "管理员" };
  } else if (profile) {
    currentUserProfile = { ...currentUserProfile, ...profile };
  }
  const displayName = currentUserProfile.contact || currentUserProfile.username || "管理员";
  if (tciaUserName) tciaUserName.textContent = displayName;
  if (tciaUserAvatar) {
    if (currentUserProfile.avatar) {
      tciaUserAvatar.innerHTML = `<img src="${currentUserProfile.avatar}" alt="" />`;
    } else {
      tciaUserAvatar.textContent = displayName.slice(0, 1);
    }
  }
}

function setAuthenticated(value) {
  authenticated = Boolean(value);
  if (authenticated) {
    document.body.classList.remove("app-locked");
    if (authGate) authGate.setAttribute("hidden", "");
    setCurrentUser(currentUserProfile);
  } else {
    document.body.classList.add("app-locked");
    if (authGate) authGate.removeAttribute("hidden");
  }
}

function initializeAuthGate() {
  const params = new URLSearchParams(window.location.search);
  const enterFromStandaloneLogin = params.get("authed") === "1";
  if (enterFromStandaloneLogin) {
    const username = params.get("username") || currentUserProfile.username || "管理员";
    setCurrentUser({ username, contact: username });
    saveUserProfile();
    addUserHistory("登录", "通过独立登录页进入工作台");
  }
  setAuthenticated(enterFromStandaloneLogin);
  if (enterFromStandaloneLogin && window.history?.replaceState) {
    window.history.replaceState(null, "", window.location.pathname);
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || ""));
}

function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.classList.add("show"), 10);
  window.setTimeout(() => {
    node.classList.remove("show");
    window.setTimeout(() => node.remove(), 180);
  }, 2200);
}

function openModal(title, body) {
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalBackdrop.hidden = false;
}

function closeModal() {
  modalBackdrop.hidden = true;
  modalBody.innerHTML = "";
}

function saveDatabase() {
  try {
    localStorage.setItem(databaseKey, JSON.stringify(cases));
  } catch (error) {
    toast("浏览器本地存储空间不足，较大的图像可能无法长期保存");
  }
}

function getCaseOptionLabel(item) {
  return `${item.name}｜${item.id}｜${item.status}｜${item.uploads.length}份`;
}

function renderCaseSelectors() {
  [caseSelector, uploadCaseSelector, reportCaseSelector].forEach((selector) => {
    if (!selector) return;
    selector.innerHTML = cases.map((item) => `<option value="${item.id}">${escapeHtml(getCaseOptionLabel(item))}</option>`).join("");
    selector.value = selectedCase.id;
  });
}

function renderHomeUpdates() {
  const pendingReview = cases.filter((item) => item.status === "待初审").length;
  const imageCategories = getImageCategories();
  const imageFiles = cases.flatMap((item) => item.uploads.filter((file) => imageCategories.includes(file.category)));
  const pendingQc = imageFiles.filter((file) => file.reviewStatus !== "已入库").length;
  const missingReports = cases.filter((item) => {
    const categories = new Set(item.uploads.map((file) => file.category));
    return !categories.has("lab") || !categories.has("pathology") || !imageCategories.some((category) => categories.has(category));
  }).length;
  if (homePendingReview) homePendingReview.textContent = `${pendingReview} 条`;
  if (homePendingQc) homePendingQc.textContent = `${pendingQc} 份`;
  if (homeMissingReports) homeMissingReports.textContent = `${missingReports} 例`;
  if (homeMessageHint) {
    const messageCount = [pendingReview, pendingQc, missingReports].filter(Boolean).length;
    homeMessageHint.textContent = messageCount ? `${messageCount} 类任务待处理` : "今日暂无新消息";
  }
}

function selectCaseById(caseId, options = {}) {
  const found = cases.find((item) => item.id === caseId);
  if (!found) return;
  selectedUploadIds.clear();
  updateDetail(found);
  renderRows();
  addUserHistory("浏览病例", `${found.id} · ${found.name}`);
  if (options.panel) showPanel(options.panel);
  if (options.tab) setCaseTab(options.tab);
}

function exportCases() {
  const header = ["编号", "病例", "年龄", "机构", "检查部位", "状态", "完整度", "诊断"];
  const lines = cases.map((item) => [item.id, item.name, item.age, item.org, item.part, item.status, `${item.progress}%`, item.diagnosis].join(","));
  const blob = new Blob([`\ufeff${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "卵巢平台病例数据.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast("病例数据已导出");
}

function downloadTextFile(filename, text) {
  const blob = new Blob([`\ufeff${text}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeWord(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function downloadWordFile(filename, bodyHtml) {
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #263238; line-height: 1.6; }
          h1 { color: #d8305a; font-size: 22px; }
          h2 { color: #263238; font-size: 16px; border-left: 4px solid #fb416b; padding-left: 8px; margin-top: 22px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0 18px; }
          th, td { border: 1px solid #f3b7c4; padding: 7px 8px; font-size: 12px; vertical-align: top; }
          th { background: #fff0f4; color: #263238; }
          .muted { color: #69777d; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `;
  const blob = new Blob([`\ufeff${html}`], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readDicomText(bytes, offset, length) {
  let value = "";
  for (let index = offset; index < offset + length && index < bytes.length; index += 1) value += String.fromCharCode(bytes[index]);
  return value.replace(/\0/g, "").trim();
}

function dicomTag(group, element) {
  return `${group.toString(16).padStart(4, "0")}${element.toString(16).padStart(4, "0")}`;
}

function readUint16(view, offset, littleEndian) {
  return view.getUint16(offset, littleEndian);
}

function readUint32(view, offset, littleEndian) {
  return view.getUint32(offset, littleEndian);
}

function parseDicomNumber(value, fallback = 0) {
  const first = String(value || "").split("\\")[0].trim();
  const parsed = Number.parseFloat(first);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const dicomVrByTag = {
  "00280002": "US",
  "00280004": "CS",
  "00280006": "US",
  "00280010": "US",
  "00280011": "US",
  "00280100": "US",
  "00280101": "US",
  "00280103": "US",
  "00281050": "DS",
  "00281051": "DS",
  "00281052": "DS",
  "00281053": "DS",
};

function parseDicomElementValue(view, bytes, item, littleEndian) {
  if (item.length === 0 || item.valueOffset + item.length > bytes.length) return "";
  const vr = item.vr || dicomVrByTag[item.tag] || "";
  if (vr === "US") return view.getUint16(item.valueOffset, littleEndian);
  if (vr === "SS") return view.getInt16(item.valueOffset, littleEndian);
  if (vr === "UL") return view.getUint32(item.valueOffset, littleEndian);
  if (vr === "SL") return view.getInt32(item.valueOffset, littleEndian);
  if (vr === "FL") return view.getFloat32(item.valueOffset, littleEndian);
  if (vr === "FD") return view.getFloat64(item.valueOffset, littleEndian);
  return readDicomText(bytes, item.valueOffset, item.length);
}

function readDicomElement(view, bytes, offset, explicitVr, littleEndian) {
  if (offset + 8 > bytes.length) return null;
  const group = readUint16(view, offset, littleEndian);
  const element = readUint16(view, offset + 2, littleEndian);
  const tag = dicomTag(group, element);
  let cursor = offset + 4;
  let vr = "";
  let length = 0;
  if (explicitVr) {
    vr = readDicomText(bytes, cursor, 2);
    cursor += 2;
    if (["OB", "OD", "OF", "OL", "OW", "SQ", "UC", "UR", "UT", "UN"].includes(vr)) {
      cursor += 2;
      length = readUint32(view, cursor, littleEndian);
      cursor += 4;
    } else {
      length = readUint16(view, cursor, littleEndian);
      cursor += 2;
    }
  } else {
    length = readUint32(view, cursor, littleEndian);
    cursor += 4;
  }
  return { tag, vr, length, valueOffset: cursor, nextOffset: length === 0xffffffff ? cursor : cursor + length };
}

function parseDicom(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const hasPreamble = readDicomText(bytes, 128, 4) === "DICM";
  let offset = hasPreamble ? 132 : 0;
  let transferSyntax = "1.2.840.10008.1.2.1";
  const values = {};

  while (offset + 8 <= bytes.length) {
    const group = view.getUint16(offset, true);
    if (group !== 0x0002) break;
    const item = readDicomElement(view, bytes, offset, true, true);
    if (!item || item.length === 0xffffffff || item.nextOffset > bytes.length) break;
    values[item.tag] = readDicomText(bytes, item.valueOffset, item.length);
    if (item.tag === "00020010") transferSyntax = values[item.tag];
    offset = item.nextOffset;
  }

  const explicitVr = transferSyntax !== "1.2.840.10008.1.2";
  const littleEndian = transferSyntax !== "1.2.840.10008.1.2.2";
  let pixelData = null;

  while (offset + 8 <= bytes.length) {
    const item = readDicomElement(view, bytes, offset, explicitVr, littleEndian);
    if (!item) break;
    if (item.tag === "7fe00010") {
      pixelData = {
        offset: item.valueOffset,
        length: item.length === 0xffffffff ? bytes.length - item.valueOffset : item.length,
        encapsulated: item.length === 0xffffffff || ["OB", "OW", "UN"].includes(item.vr),
      };
      break;
    }
    if (item.length === 0xffffffff || item.nextOffset <= offset || item.nextOffset > bytes.length) break;
    if (["00280002", "00280004", "00280006", "00280010", "00280011", "00280100", "00280101", "00280103", "00281050", "00281051", "00281052", "00281053"].includes(item.tag)) values[item.tag] = parseDicomElementValue(view, bytes, item, littleEndian);
    offset = item.nextOffset;
  }

  return { bytes, view, values, transferSyntax, explicitVr, littleEndian, pixelData };
}

function findEmbeddedJpeg(bytes) {
  let start = -1;
  for (let index = 0; index < bytes.length - 1; index += 1) {
    if (bytes[index] === 0xff && bytes[index + 1] === 0xd8) {
      start = index;
      break;
    }
  }
  if (start < 0) return null;
  for (let index = start + 2; index < bytes.length - 1; index += 1) {
    if (bytes[index] === 0xff && bytes[index + 1] === 0xd9) return bytes.slice(start, index + 2);
  }
  return null;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(blob);
  });
}

function renderUncompressedDicomToJpg(parsed) {
  const { values, view, pixelData, littleEndian } = parsed;
  const rows = parseDicomNumber(values["00280010"]);
  const columns = parseDicomNumber(values["00280011"]);
  const samples = parseDicomNumber(values["00280002"], 1);
  const bitsAllocated = parseDicomNumber(values["00280100"], 16);
  const bitsStored = parseDicomNumber(values["00280101"], bitsAllocated);
  const signed = parseDicomNumber(values["00280103"], 0) === 1;
  const planar = parseDicomNumber(values["00280006"], 0);
  const photometric = String(values["00280004"] || "MONOCHROME2").toUpperCase();
  const slope = parseDicomNumber(values["00281053"], 1) || 1;
  const intercept = parseDicomNumber(values["00281052"], 0);
  const windowCenter = parseDicomNumber(values["00281050"], Number.NaN);
  const windowWidth = parseDicomNumber(values["00281051"], Number.NaN);

  if (!rows || !columns || !pixelData) throw new Error("DICOM 缺少行列或像素数据");
  if (![8, 16].includes(bitsAllocated)) throw new Error(`暂不支持 ${bitsAllocated} bit DICOM 像素`);
  if (![1, 3].includes(samples)) throw new Error(`暂不支持 ${samples} 通道 DICOM 图像`);

  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(columns, rows);
  const data = image.data;
  const pixelOffset = pixelData.offset;
  const pixelCount = rows * columns;
  const bytesPerSample = bitsAllocated / 8;
  const mask = bitsStored < bitsAllocated ? (1 << bitsStored) - 1 : null;

  if (samples === 3 && bitsAllocated === 8) {
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      let rIndex;
      let gIndex;
      let bIndex;
      if (planar === 1) {
        rIndex = pixelOffset + pixel;
        gIndex = pixelOffset + pixelCount + pixel;
        bIndex = pixelOffset + pixelCount * 2 + pixel;
      } else {
        rIndex = pixelOffset + pixel * 3;
        gIndex = rIndex + 1;
        bIndex = rIndex + 2;
      }
      let red = view.getUint8(rIndex);
      let green = view.getUint8(gIndex);
      let blue = view.getUint8(bIndex);
      if (photometric.startsWith("YBR")) {
        const y = red;
        const cb = green - 128;
        const cr = blue - 128;
        red = y + 1.402 * cr;
        green = y - 0.344136 * cb - 0.714136 * cr;
        blue = y + 1.772 * cb;
      }
      const target = pixel * 4;
      data[target] = Math.max(0, Math.min(255, red));
      data[target + 1] = Math.max(0, Math.min(255, green));
      data[target + 2] = Math.max(0, Math.min(255, blue));
      data[target + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95);
  }

  const valuesForWindow = new Float32Array(pixelCount);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixelOffset + pixel * bytesPerSample;
    let value = bitsAllocated === 8 ? (signed ? view.getInt8(offset) : view.getUint8(offset)) : signed ? view.getInt16(offset, littleEndian) : view.getUint16(offset, littleEndian);
    if (mask) {
      value &= mask;
      if (signed && value & (1 << (bitsStored - 1))) value -= 1 << bitsStored;
    }
    value = value * slope + intercept;
    valuesForWindow[pixel] = value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const hasWindow = Number.isFinite(windowCenter) && Number.isFinite(windowWidth) && windowWidth > 1;
  const low = hasWindow ? windowCenter - 0.5 - (windowWidth - 1) / 2 : min;
  const high = hasWindow ? windowCenter - 0.5 + (windowWidth - 1) / 2 : max;
  const range = high > low ? high - low : 1;
  const invert = photometric.includes("MONOCHROME1");
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    let gray = ((valuesForWindow[pixel] - low) / range) * 255;
    gray = Math.max(0, Math.min(255, gray));
    if (invert) gray = 255 - gray;
    const target = pixel * 4;
    data[target] = gray;
    data[target + 1] = gray;
    data[target + 2] = gray;
    data[target + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.95);
}

async function createDicomJpgDataUrl(file) {
  const arrayBuffer = await file.arrayBuffer();
  const parsed = parseDicom(arrayBuffer);
  const embeddedJpeg = findEmbeddedJpeg(parsed.bytes);
  if (embeddedJpeg) {
    return {
      src: await blobToDataUrl(new Blob([embeddedJpeg], { type: "image/jpeg" })),
      name: file.name.replace(/\.(dcm|dicom)$/i, ".jpg"),
      meta: "已提取 DICOM 内嵌 JPEG 图像",
    };
  }
  const compressedSyntax = !["1.2.840.10008.1.2", "1.2.840.10008.1.2.1", "1.2.840.10008.1.2.2"].includes(parsed.transferSyntax);
  if (compressedSyntax) throw new Error(`当前浏览器暂不支持该压缩 DICOM：${parsed.transferSyntax}`);
  return {
    src: renderUncompressedDicomToJpg(parsed),
    name: file.name.replace(/\.(dcm|dicom)$/i, ".jpg"),
    meta: "已按 DICOM 像素数据生成 JPG",
  };
}

function dataUrlToBlob(dataUrl) {
  const [meta, data] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

async function downloadUrl(url, filename) {
  const objectUrl = url.startsWith("data:") ? URL.createObjectURL(dataUrlToBlob(url)) : url;
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (objectUrl !== url) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 500);
}

function downloadTemplate() {
  downloadTextFile(
    "卵巢平台上传模板.csv",
    [
      "病例编号,资料类型,超声分类,文件名,是否必填,备注",
      "CASE-2026-001,基本信息,,case-info.jpg,是,机构编号/机构名称/检查时间/仪器品牌型号",
      "CASE-2026-001,临床信息,,clinical.png,是,年龄/BMI/月经婚育史/家族史/既往治疗史",
      "CASE-2026-001,超声图像,灰阶超声,example.dcm,是,至少2张",
      "CASE-2026-001,超声图像,彩色多普勒超声,example.jpg,是,至少1张",
      "CASE-2026-001,超声图像,超声造影,contrast.avi,否,支持AVI动态视频",
      "CASE-2026-001,超声图像,弹性成像,elastography.png,否,支持JPEG/JPG/PNG/DICOM/DCM/AVI",
      "CASE-2026-001,超声报告,O-RADS分级,ultrasound.png,是,O-RADS 0-5",
      "CASE-2026-001,检验结果-肿瘤标志物,,tumor-marker.png,是,CA125/HE4/AFP/CEA/CA199/CA153/SCC",
      "CASE-2026-001,病理报告,,pathology.jpg,是,支持JPEG/JPG/PNG/DICOM/DCM/AVI",
      "CASE-2026-001,随访结果,,followup.dcm,否,病例提交后可再次编辑",
    ].join("\n"),
  );
  toast("上传模板已下载");
}

function downloadReportTemplate() {
  downloadTextFile(
    "卵巢平台报告模板.csv",
    [
      "病例编号,报告类型,报告日期,文件名,关键指标/结论,审核状态",
      "CASE-2026-001,检验结果-肿瘤标志物,2026-07-09,tumor-marker.png,CA125/HE4/AFP/CEA/CA199/CA153/SCC,待初审",
      "CASE-2026-001,病理报告,2026-07-09,pathology.jpg,病理诊断结论,待初审",
      "CASE-2026-001,CT / MRI / 核医学,2026-07-09,ct.dcm,影像诊断结论,待初审",
      "CASE-2026-001,随访结果,2026-07-09,followup.png,复查实验室和超声结果,待初审",
      "CASE-2026-001,其他,2026-07-09,other.jpg,补充说明,待初审",
    ].join("\n"),
  );
  toast("报告模板已下载");
}

function exportLedger() {
  const rows = cases
    .map((item) => {
      const uploadCount = item.uploads.length;
      const storedCount = item.uploads.filter((file) => file.stored).length;
      const imageCount = item.uploads.filter((file) => getImageCategories().includes(file.category)).length;
      return `<tr><td>${escapeWord(item.id)}</td><td>${escapeWord(item.name)}</td><td>${escapeWord(item.org)}</td><td>${escapeWord(item.status)}</td><td>${imageCount}</td><td>${uploadCount}</td><td>${storedCount}</td><td>${item.progress}%</td><td>${escapeWord(item.diagnosis)}</td></tr>`;
    })
    .join("");
  downloadWordFile(
    "卵巢平台完整性台账.doc",
    `
      <h1>卵巢平台完整性台账</h1>
      <p class="muted">导出时间：${new Date().toLocaleString("zh-CN")}</p>
      <table>
        <thead><tr><th>病例编号</th><th>病例</th><th>机构</th><th>状态</th><th>影像数</th><th>上传总数</th><th>入库文件数</th><th>完整度</th><th>诊断</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `,
  );
  toast("完整性台账 Word 已导出");
}

function openNewCaseModal() {
  openModal(
    "新建病例",
    `
      <form class="modal-form" id="newCaseForm">
        <label>年龄<input name="age" required type="number" min="1" max="120" placeholder="请输入年龄" /></label>
        <label>上传机构<select name="org"><option>牵头中心</option><option>协作中心</option><option>区域分中心</option></select></label>
        <label>检查部位<select name="part"><option>卵巢</option><option>附件区</option><option>盆腔</option></select></label>
        <label class="full">临床诊断<input name="diagnosis" required placeholder="请输入初步诊断" /></label>
        <div class="modal-actions">
          <button class="ghost modal-cancel" type="button">取消</button>
          <button class="primary" type="submit">保存病例</button>
        </div>
      </form>
    `,
  );
}

function openMessagesModal() {
  openModal(
    "消息提醒",
    `
      <div class="message-list">
        <div><strong>退审提醒</strong><span>CASE-2026-073 需补充病理报告。</span></div>
        <div><strong>上传完成</strong><span>灰阶超声 DICOM 已转换为 JPG 预览。</span></div>
        <div><strong>复审通知</strong><span>3 条病例已进入待复审队列。</span></div>
      </div>
    `,
  );
}

function showPanel(panelId) {
  document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.panel === panelId));
  renderCaseSelectors();
  if (panelId === "reportPanel") {
    renderReportFiles();
    renderReportMatrix();
  }
  if (panelId === "uploadPanel") renderImageQualitySummary();
}

function statusClass(status) {
  if (status === "退审中" || status === "不认可数据" || status === "作废数据") return "color: var(--red)";
  if (status === "已入库" || status === "已支付") return "color: var(--green)";
  if (status === "初审中" || status === "待复审") return "color: var(--amber)";
  return "color: var(--cyan)";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderProfileHistory() {
  const list = getUserHistory();
  return list.length
    ? list.map((item) => `<li><strong>${escapeHtml(item.type)}</strong><span>${escapeHtml(item.detail)}</span><em>${escapeHtml(item.time)}</em></li>`).join("")
    : "<li><strong>暂无记录</strong><span>登录、浏览病例、审批操作会在这里显示。</span><em>-</em></li>";
}

function renderApprovalRecords() {
  const rows = cases
    .filter((item) => ["已入库", "待复审", "退审中", "不认可数据", "作废数据", "已支付"].includes(item.status) || item.uploads.some((file) => file.reviewStatus === "已入库"))
    .slice(0, 8)
    .map((item) => `<li><strong>${escapeHtml(item.id)}</strong><span>${escapeHtml(item.name)} · ${escapeHtml(item.status)}</span><em>${item.progress}%</em></li>`);
  return rows.length ? rows.join("") : "<li><strong>暂无审批记录</strong><span>完成入库、退审或复审后会自动汇总。</span><em>-</em></li>";
}

function openProfileModal() {
  const user = currentUserProfile;
  openModal(
    "个人中心",
    `
      <div class="profile-center">
        <section class="profile-head">
          <div class="profile-avatar">${user.avatar ? `<img src="${user.avatar}" alt="" />` : escapeHtml((user.contact || user.username || "管").slice(0, 1))}</div>
          <div>
            <h3>${escapeHtml(user.contact || user.username || "管理员")}</h3>
            <p>${escapeHtml(user.organization || "-")} · ${escapeHtml(user.department || "-")} · ${escapeHtml(user.title || "-")}</p>
          </div>
        </section>
        <form id="profileForm" class="profile-form">
          <label>用户名<input name="username" required value="${escapeHtml(user.username || "")}" /></label>
          <label>姓名<input name="contact" required value="${escapeHtml(user.contact || "")}" /></label>
          <label>手机号<input name="phone" required pattern="^1[3-9]\\d{9}$" value="${escapeHtml(user.phone || "")}" /></label>
          <label>所属机构<select name="organization">
            ${["牵头中心", "协作中心", "区域分中心"].map((item) => `<option ${item === user.organization ? "selected" : ""}>${item}</option>`).join("")}
          </select></label>
          <label>科室<select name="department">
            ${["超声医学科", "妇科", "影像科", "病理科", "核医学科", "科研管理办公室"].map((item) => `<option ${item === user.department ? "selected" : ""}>${item}</option>`).join("")}
          </select></label>
          <label>职称<select name="title">
            ${["主任医师", "副主任医师", "主治医师", "住院医师", "技师", "研究员"].map((item) => `<option ${item === user.title ? "selected" : ""}>${item}</option>`).join("")}
          </select></label>
          <label>更换头像<input name="avatar" type="file" accept="image/*" /></label>
          <div class="modal-actions">
            <button class="ghost modal-cancel" type="button">关闭</button>
            <button class="primary" type="submit">保存资料</button>
          </div>
        </form>
        <section class="profile-records">
          <div>
            <h3>浏览记录</h3>
            <ul>${renderProfileHistory()}</ul>
          </div>
          <div>
            <h3>审批记录</h3>
            <ul>${renderApprovalRecords()}</ul>
          </div>
        </section>
      </div>
    `,
  );
}

function highlightText(value) {
  const safe = escapeHtml(value);
  if (!activeQuery) return safe;
  const pattern = new RegExp(`(${escapeRegExp(activeQuery)})`, "gi");
  return safe.replace(pattern, '<mark class="search-hit">$1</mark>');
}

function getFilteredCases() {
  const part = partFilter?.value || "全部";
  const org = orgFilter?.value || "全部";
  const hidden = hiddenFilter?.value || "全部";
  const keyword = activeQuery.toLowerCase();
  return cases.filter((item) => {
    if (item.status !== activeStatus) return false;
    if (queryApplied && part !== "全部" && item.part !== part) return false;
    if (queryApplied && org !== "全部" && item.org !== org) return false;
    if (queryApplied && hidden === "未隐藏" && item.hidden) return false;
    if (queryApplied && hidden === "已隐藏" && !item.hidden) return false;
    if (!keyword) return true;
    const haystack = [item.id, item.name, item.age, item.org, item.part, item.status, item.diagnosis].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });
}

function updateQuerySummary(total) {
  if (!querySummary) return;
  if (!queryApplied && !activeQuery) {
    querySummary.hidden = true;
    querySummary.textContent = "";
    return;
  }
  const bits = [`状态：${activeStatus}`];
  if (partFilter?.value && partFilter.value !== "全部") bits.push(`检查部位：${partFilter.value}`);
  if (orgFilter?.value && orgFilter.value !== "全部") bits.push(`上传机构：${orgFilter.value}`);
  if (hiddenFilter?.value && hiddenFilter.value !== "全部") bits.push(`隐藏状态：${hiddenFilter.value}`);
  if (activeQuery) bits.push(`关键词：${activeQuery}`);
  querySummary.hidden = false;
  querySummary.innerHTML = `查询结果 ${total} 条<span>${bits.map(escapeHtml).join(" / ")}</span>`;
}

function updateStatusCounts() {
  const counts = cases.reduce((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1;
    return result;
  }, {});
  statusCards.forEach((card) => {
    const countNode = card.querySelector("strong");
    if (countNode) countNode.textContent = counts[card.dataset.status] || 0;
  });
}

function renderRows() {
  updateStatusCounts();
  renderCaseSelectors();
  renderHomeUpdates();
  const list = getFilteredCases();
  if (!list.length) {
    rows.innerHTML = '<tr><td class="empty-row" colspan="10">未查询到符合条件的数据，请调整筛选条件后重试。</td></tr>';
    updateSelectedCount();
    updateQuerySummary(0);
    return;
  }
  rows.innerHTML = list
    .map(
      (item) => `
        <tr class="${item.id === selectedCase.id ? "selected" : ""}" data-id="${item.id}">
          <td><input class="case-check" type="checkbox" data-id="${item.id}" ${selectedIds.has(item.id) ? "checked" : ""} aria-label="选择 ${item.id}" /></td>
          <td>${highlightText(item.id)}</td>
          <td>${highlightText(item.name)}</td>
          <td>${item.age}</td>
          <td>${highlightText(item.org)}</td>
          <td>${highlightText(item.part)}</td>
          <td>${highlightText(item.diagnosis)}</td>
          <td><div class="progress" aria-label="完整度 ${item.progress}%"><span style="width:${item.progress}%"></span></div></td>
          <td style="${statusClass(item.status)}">${item.status}</td>
          <td><button class="row-action" type="button" data-id="${item.id}">查看</button></td>
        </tr>
      `,
    )
    .join("");
  updateSelectedCount();
  updateQuerySummary(list.length);
}

function createDeleteButton() {
  const button = document.createElement("button");
  button.className = "delete-file";
  button.type = "button";
  button.textContent = "删除";
  return button;
}

function updateDetail(item) {
  selectedCase = item;
  document.querySelector("#detailTitle").textContent = item.id;
  document.querySelector("#detailMeta").textContent = `${item.org} · ${item.part} · ${item.status}`;
  document.querySelector("#patientName").textContent = item.name;
  document.querySelector("#patientAge").textContent = item.age;
  document.querySelector("#patientDiagnosis").textContent = item.diagnosis;
  document.querySelector("#patientProgress").textContent = `${item.progress}%`;
  if (uploadLibraryMeta) uploadLibraryMeta.textContent = `${item.id} · ${item.name} · ${item.uploads.length} 份资料`;
  renderCaseSelectors();
  renderUploadViews();
}

function setCaseTab(tabId) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.toggle("active", content.id === tabId));
}

function setScan(scanId) {
  activeScan = scanId;
  const scan = scanTypes[scanId];
  document.querySelectorAll(".mini-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.scan === scanId));
  document.querySelector("#scanTitle").textContent = scan.title;
  document.querySelector("#scanNote").textContent = scan.note;

  renderUploadViews();
}

function isAcceptedUpload(file) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".dcm") ||
    name.endsWith(".dicom") ||
    name.endsWith(".avi") ||
    type === "image/jpeg" ||
    type === "image/png" ||
    type === "application/dicom" ||
    type === "video/avi" ||
    type === "video/x-msvideo"
  );
}

function isDicomFile(file) {
  const name = file.name.toLowerCase();
  return name.endsWith(".dcm") || name.endsWith(".dicom") || file.type.toLowerCase() === "application/dicom";
}

function isRasterImageFile(file) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || type === "image/jpeg" || type === "image/png";
}

function isVideoFile(file) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return name.endsWith(".avi") || type === "video/avi" || type === "video/x-msvideo";
}

async function addFiles(files) {
  const incoming = [...files];
  const accepted = incoming.filter(isAcceptedUpload);
  let rejected = incoming.length - accepted.length;
  if (!accepted.length) {
    toast("仅支持 JPEG、JPG、PNG、DICOM/DCM、AVI 格式");
    return;
  }
  for (const file of accepted) {
    uploadCounter += 1;
    const dicom = isDicomFile(file);
    const isImage = isRasterImageFile(file) && !dicom;
    const isVideo = isVideoFile(file);
    const category = uploadCategory || activeScan;
    const label = scanTypes[category]?.title || uploadTarget;
    let converted = null;
    if (dicom) {
      try {
        converted = await createDicomJpgDataUrl(file);
      } catch (error) {
        rejected += 1;
        toast(`${file.name} 转换失败：${error.message}`);
        continue;
      }
    }
    const imageSrc = isImage ? await blobToDataUrl(file) : "";
    const videoSrc = isVideo ? await blobToDataUrl(file) : "";
    selectedCase.uploads.unshift({
      id: `upload-${Date.now()}-${uploadCounter}`,
      category,
      label,
      name: file.name,
      kind: dicom ? "dicom" : isImage ? "image" : isVideo ? "video" : "file",
      src: imageSrc,
      videoSrc,
      convertedSrc: converted?.src || "",
      convertedName: converted?.name || "",
      dicomMeta: converted?.meta || "",
      stored: false,
      reviewStatus: "待初审",
      converted: dicom,
      uploadedAt: new Date().toLocaleString("zh-CN"),
    });
  }
  const added = accepted.length - rejected + incoming.length - accepted.length;
  if (added <= 0) return;
  selectedCase.progress = Math.min(100, selectedCase.progress + added * 8);
  saveDatabase();
  updateDetail(selectedCase);
  renderRows();
  toast(rejected ? `${uploadTarget}已加入上传列表，${rejected} 个非支持格式已忽略` : `${uploadTarget}已加入上传列表`);
}

function renderUploadViews() {
  if (!imageGrid || !selectedCase) return;
  const scan = scanTypes[activeScan];
  const currentScanUploads = selectedCase.uploads.filter((file) => file.category === activeScan);
  imageGrid.innerHTML = currentScanUploads.length
    ? currentScanUploads.map(renderUploadFigure).join("")
    : `<div class="empty-state scan-empty">${scan.empty}</div>`;

  if (uploadList) {
    uploadList.innerHTML = selectedCase.uploads.length
      ? selectedCase.uploads.map(renderUploadRow).join("")
      : '<div class="empty-state">当前病例暂无影像资料，请进入病例查看的“超声图像”页签上传。</div>';
  }
  renderReportFiles();
  renderReportMatrix();
  renderImageQualitySummary();
  if (uploadLibraryMeta) uploadLibraryMeta.textContent = `${selectedCase.id} · ${selectedCase.name} · ${selectedCase.uploads.length} 份资料`;
}

function renderUploadFigure(file) {
  const previewSrc = file.kind === "dicom" ? file.convertedSrc : file.kind === "video" ? file.videoSrc : file.src;
  const downloadLabel = file.converted ? "下载JPG" : file.kind === "video" ? "下载原文件" : "下载原图";
  const preview =
    file.kind === "image"
      ? `<button class="preview-button" data-preview-id="${file.id}" type="button" aria-label="放大预览 ${file.name}"><img src="${file.src}" alt="${file.name}" /></button>`
      : file.kind === "dicom"
        ? `<button class="dicom-preview preview-button" data-preview-id="${file.id}" type="button" aria-label="放大预览 ${file.convertedName}"><img src="${previewSrc}" alt="${file.convertedName}" /><span>DICOM/DCM 已自动转换为 JPG 预览</span></button>`
        : file.kind === "video"
          ? `<button class="video-preview preview-button" data-preview-id="${file.id}" type="button" aria-label="播放预览 ${file.name}"><video src="${file.videoSrc}" muted></video><span>AVI 动态视频已上传</span></button>`
          : `<div class="empty-state">附件已上传</div>`;
  return `
    <figure class="${selectedUploadIds.has(file.id) ? "selected-upload" : ""}" data-upload-id="${file.id}" data-scan-card="${file.category}">
      <div class="preview-actions">
        <label class="upload-select"><input class="upload-check" type="checkbox" data-upload-id="${file.id}" ${selectedUploadIds.has(file.id) ? "checked" : ""} />选择</label>
        <button class="delete-file" data-upload-id="${file.id}" type="button">删除</button>
      </div>
      <div class="preview-frame">${preview}</div>
      <figcaption>
        <span>${file.label} · ${file.name} · ${file.reviewStatus || (file.stored ? "已入库" : "待初审")}</span>
        ${previewSrc ? `<button class="download-file" data-download-id="${file.id}" type="button">${downloadLabel}</button>` : ""}
      </figcaption>
    </figure>
  `;
}

function renderUploadRow(file) {
  const status = file.converted ? "已自动转 JPG" : file.reviewStatus || (file.stored ? "已入库" : "待初审");
  const thumbSrc = file.converted ? file.convertedSrc : file.kind === "image" ? file.src : file.kind === "video" ? file.videoSrc : "";
  const downloadLabel = file.converted ? "下载JPG" : file.kind === "video" ? "下载原文件" : "下载原图";
  return `
    <div class="upload-row ${selectedUploadIds.has(file.id) ? "selected-upload" : ""}" data-upload-id="${file.id}">
      <input class="upload-check" type="checkbox" data-upload-id="${file.id}" ${selectedUploadIds.has(file.id) ? "checked" : ""} aria-label="选择 ${file.name}" />
      <span>${file.label}</span>
      <strong>${file.name}</strong>
      <em>${status}</em>
      ${thumbSrc ? `<button class="row-thumb" data-preview-id="${file.id}" type="button" aria-label="预览 ${file.convertedName || file.name}">${file.kind === "video" ? `<video src="${thumbSrc}" muted></video>` : `<img src="${thumbSrc}" alt="${file.convertedName || file.name}" />`}</button>` : ""}
      ${thumbSrc ? `<button class="download-file inline" data-download-id="${file.id}" type="button">${downloadLabel}</button>` : ""}
      <button class="delete-file inline" data-upload-id="${file.id}" type="button">删除</button>
    </div>
  `;
}

function findUpload(uploadId) {
  return selectedCase.uploads.find((file) => file.id === uploadId);
}

function openPreview(uploadId) {
  const file = findUpload(uploadId);
  if (!file) return;
  const src = file.converted ? file.convertedSrc : file.src;
  const videoSrc = file.kind === "video" ? file.videoSrc : "";
  if (!src && !videoSrc) return;
  const name = file.converted ? file.convertedName : file.name;
  const media = file.kind === "video" ? `<video class="preview-video" src="${videoSrc}" controls></video>` : `<img src="${src}" alt="${name}" />`;
  openModal(
    file.kind === "video" ? "AVI 动态视频预览" : "JPG 图像预览",
    `
      <div class="preview-modal">
        ${media}
        <div class="modal-actions">
          <button class="ghost modal-cancel" type="button">关闭</button>
          <button class="primary download-file inline" data-download-id="${file.id}" type="button">${file.converted ? "下载JPG" : file.kind === "video" ? "下载原文件" : "下载原图"}</button>
        </div>
      </div>
    `,
  );
}

async function downloadUploadPreview(uploadId) {
  const file = findUpload(uploadId);
  if (!file) return;
  const src = file.converted ? file.convertedSrc : file.kind === "video" ? file.videoSrc : file.src;
  if (!src) return;
  const name = file.converted ? file.convertedName : file.name;
  await downloadUrl(src, name || "converted-preview.jpg");
  toast(`${name || "文件"} 已开始下载`);
}

function renderReportFiles() {
  const reportCategories = ["lab", "pathology", "ct", "followup", "other"];
  reportCategories.forEach((category) => {
    const container = reportFileContainers[category];
    if (!container) return;
    const files = selectedCase.uploads.filter((file) => file.category === category);
    container.innerHTML = files.length ? files.map(renderUploadRow).join("") : '<div class="empty-state small">暂无报告文件</div>';
  });
  if (reportAllFiles) {
    const files = selectedCase.uploads;
    reportAllFiles.innerHTML = files.length ? files.map(renderUploadRow).join("") : '<div class="empty-state">当前病例暂无上传资料。</div>';
  }
  if (reportTotalCount) reportTotalCount.textContent = `${selectedCase.uploads.length} 份`;
  if (reportPatientSummary) reportPatientSummary.textContent = `${selectedCase.name}（${selectedCase.id}）共上传 ${selectedCase.uploads.length} 份资料，当前状态：${selectedCase.status}`;
}

function renderReportMatrix() {
  const labels = { history: "病史", lab: "检验结果", pathology: "病理报告", ct: "CT / MRI / 核医学", followup: "随访结果", other: "其他" };
  Object.keys(labels).forEach((category) => {
    const files = selectedCase.uploads.filter((file) => file.category === category);
    const count = document.querySelector(`#${category}Count`);
    const status = document.querySelector(`#${category}Status`);
    const latest = document.querySelector(`#${category}Latest`);
    if (count) count.textContent = `${files.length} 份`;
    if (status) {
      const allStored = files.length > 0 && files.every((file) => file.reviewStatus === "已入库");
      status.textContent = files.length ? (allStored ? "已入库" : "待审核") : "待补充";
      status.className = files.length ? (allStored ? "ok" : "warn") : "warn";
    }
    if (latest) latest.textContent = files[0]?.uploadedAt || "-";
  });
  const ultrasoundFiles = selectedCase.uploads.filter((file) => getImageCategories().includes(file.category));
  const ultrasoundCount = document.querySelector("#ultrasoundCount");
  const ultrasoundStatus = document.querySelector("#ultrasoundStatus");
  const ultrasoundLatest = document.querySelector("#ultrasoundLatest");
  if (ultrasoundCount) ultrasoundCount.textContent = `${ultrasoundFiles.length} 份`;
  if (ultrasoundStatus) {
    const allStored = ultrasoundFiles.length > 0 && ultrasoundFiles.every((file) => file.reviewStatus === "已入库");
    ultrasoundStatus.textContent = ultrasoundFiles.length ? (allStored ? "已入库" : "待审核") : "待补充";
    ultrasoundStatus.className = ultrasoundFiles.length ? (allStored ? "ok" : "warn") : "warn";
  }
  if (ultrasoundLatest) ultrasoundLatest.textContent = ultrasoundFiles[0]?.uploadedAt || "-";
}

function renderImageQualitySummary() {
  const categories = [
    ["gray", imageQcNodes.grayCount, imageQcNodes.grayStatus],
    ["color", imageQcNodes.colorCount, imageQcNodes.colorStatus],
    ["spectrum", imageQcNodes.spectrumCount, imageQcNodes.spectrumStatus],
    ["threeD", imageQcNodes.threeDCount, imageQcNodes.threeDStatus],
    ["contrast", imageQcNodes.contrastCount, imageQcNodes.contrastStatus],
    ["elastography", imageQcNodes.elastographyCount, imageQcNodes.elastographyStatus],
  ];
  const imageFiles = selectedCase.uploads.filter((file) => getImageCategories().includes(file.category));
  categories.forEach(([category, countNode, statusNode]) => {
    const files = selectedCase.uploads.filter((file) => file.category === category);
    if (countNode) countNode.textContent = `${files.length} 份`;
    if (statusNode) {
      const allStored = files.length && files.every((file) => file.reviewStatus === "已入库");
      statusNode.textContent = files.length ? (allStored ? "已入库" : "待审核") : "待补充";
      statusNode.className = files.length ? (allStored ? "ok" : "warn") : "warn";
    }
  });
  if (imageQcNodes.total) imageQcNodes.total.textContent = `${imageFiles.length} 份`;
  if (imageQcNodes.pending) imageQcNodes.pending.textContent = `${imageFiles.filter((file) => file.reviewStatus !== "已入库").length} 份`;
  if (imageQcNodes.dicom) imageQcNodes.dicom.textContent = `${imageFiles.filter((file) => file.converted).length} 份`;
}

function exportPatientReport() {
  const labels = { history: "病史", gray: "灰阶超声", color: "彩色多普勒超声", spectrum: "频谱多普勒超声", threeD: "三维超声", contrast: "超声造影", elastography: "弹性成像", lab: "检验结果", pathology: "病理报告", ct: "CT / MRI / 核医学", followup: "随访结果", other: "其他" };
  const categoryRows = Object.entries(labels)
    .map(([category, label]) => {
      const files = selectedCase.uploads.filter((file) => file.category === category);
      if (!files.length) return "";
      const stored = files.filter((file) => file.reviewStatus === "已入库").length;
      return `<tr><td>${label}</td><td>${files.length} 份</td><td>${stored} 份</td><td>${escapeWord(files[0]?.uploadedAt || "-")}</td></tr>`;
    })
    .join("");
  const detailRows = selectedCase.uploads.length
    ? selectedCase.uploads
        .map(
          (file, index) =>
            `<tr><td>${index + 1}</td><td>${escapeWord(labels[file.category] || file.label || file.category)}</td><td>${escapeWord(file.convertedName || file.name)}</td><td>${escapeWord(file.name)}</td><td>${escapeWord(file.reviewStatus || (file.stored ? "已入库" : "待初审"))}</td><td>${escapeWord(file.uploadedAt || "-")}</td><td>${escapeWord(file.converted ? file.dicomMeta || "已转换为JPG预览" : "-")}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="7">暂无上传资料。</td></tr>';
  downloadWordFile(
    `${selectedCase.id}_资料报告.doc`,
    `
      <h1>卵巢肿瘤影像数据收集平台 - 病例资料报告</h1>
      <p class="muted">导出时间：${new Date().toLocaleString("zh-CN")}</p>
      <h2>一、病例基本信息</h2>
      <table>
        <tbody>
          <tr><th>病例编号</th><td>${escapeWord(selectedCase.id)}</td><th>病例标识</th><td>${escapeWord(selectedCase.name)}</td></tr>
          <tr><th>年龄</th><td>${selectedCase.age}</td><th>上传机构</th><td>${escapeWord(selectedCase.org)}</td></tr>
          <tr><th>检查部位</th><td>${escapeWord(selectedCase.part)}</td><th>当前状态</th><td>${escapeWord(selectedCase.status)}</td></tr>
          <tr><th>资料完整度</th><td>${selectedCase.progress}%</td><th>上传总数</th><td>${selectedCase.uploads.length} 份</td></tr>
          <tr><th>诊断/病理结果</th><td colspan="3">${escapeWord(selectedCase.diagnosis)}</td></tr>
        </tbody>
      </table>
      <h2>二、资料上传概况</h2>
      <table>
        <thead><tr><th>资料类型</th><th>文件数</th><th>已入库</th><th>最近上传</th></tr></thead>
        <tbody>${categoryRows || '<tr><td colspan="4">暂无上传资料。</td></tr>'}</tbody>
      </table>
      <h2>三、资料明细</h2>
      <table>
        <thead><tr><th>序号</th><th>类型</th><th>文件名</th><th>原始文件</th><th>审核状态</th><th>上传时间</th><th>DICOM转换</th></tr></thead>
        <tbody>${detailRows}</tbody>
      </table>
      <h2>四、简要结论</h2>
      <p>${selectedCase.uploads.length ? "该病例已有上传资料，可结合病例查看和影像质控模块继续审核、预览或入库。" : "该病例尚无上传资料，请在病例查看模块补充。"}</p>
    `,
  );
  toast(`${selectedCase.id} 的 Word 报告已导出`);
}

function openCaseUpload() {
  showPanel("casePanel");
  setCaseTab("ultrasound");
  setScan(activeScan);
  toast("已进入病例查看 - 超声图像上传");
}

function deleteUpload(uploadId) {
  selectedCase.uploads = selectedCase.uploads.filter((file) => file.id !== uploadId);
  selectedUploadIds.delete(uploadId);
  selectedCase.progress = Math.max(0, selectedCase.progress - 5);
  saveDatabase();
  updateDetail(selectedCase);
  renderRows();
  toast("文件已删除");
}

function storeCurrentCase() {
  const fileMode = selectedUploadIds.size > 0;
  const files = selectedUploadIds.size
    ? selectedCase.uploads.filter((file) => selectedUploadIds.has(file.id))
    : selectedCase.uploads;
  files.forEach((file) => {
    file.stored = true;
    file.reviewStatus = "已入库";
  });
  if (!fileMode) {
    selectedCase.status = "已入库";
    selectedCase.progress = 100;
    activeStatus = "已入库";
    statusCards.forEach((card) => card.classList.toggle("active", card.dataset.status === activeStatus));
  }
  selectedUploadIds.clear();
  saveDatabase();
  addUserHistory("审批入库", fileMode ? `${selectedCase.id} 选中文件已入库` : `${selectedCase.id} 病例已入库`);
  updateDetail(selectedCase);
  renderRows();
  toast(fileMode ? "选中文件已入库" : `${selectedCase.id} 已入库保留`);
}

function updateSelectedCount() {
  if (selectedCount) selectedCount.textContent = `已选 ${selectedIds.size} 条`;
  if (selectAllCases) {
    const checks = [...document.querySelectorAll(".case-check")];
    selectAllCases.checked = checks.length > 0 && checks.every((input) => input.checked);
  }
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => showPanel(item.dataset.panel));
});

document.querySelectorAll(".flow-guide button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.panel) showPanel(button.dataset.panel);
    if (button.dataset.tabJump) setCaseTab(button.dataset.tabJump);
    if (button.dataset.action === "export-ledger") exportLedger();
  });
});

document.querySelectorAll(".site-nav button, .hero-actions button, .quick-grid button, .home-task-grid article").forEach((button) => {
  button.addEventListener("click", (event) => {
    const target = event.target.closest("button, article");
    if (target.dataset.panel) showPanel(target.dataset.panel);
    if (target.dataset.tabJump) setCaseTab(target.dataset.tabJump);
    if (target.dataset.action === "messages") openMessagesModal();
  });
});

document.querySelectorAll(".auth-switch button").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.authView;
    document.querySelectorAll(".auth-switch button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".auth-form").forEach((form) => form.classList.toggle("active", form.id.toLowerCase().includes(view)));
  });
});

if (authLoginForm) {
  authLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(authLoginForm);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");
    const savedUser = loadUserProfile();
    const isAdmin = username === "管理员";
    const knownUser = isAdmin || username === savedUser.username || username === savedUser.contact;
    const expectedPassword = isAdmin ? "12345678" : savedUser.password;
    if (!knownUser || password !== expectedPassword) {
      toast("账号或密码错误，请检查用户名和密码");
      return;
    }
    setCurrentUser(username === "管理员" ? defaultUserProfile : savedUser);
    addUserHistory("登录", `${username} 登录工作台`);
    setAuthenticated(true);
    toast("登录成功，已进入工作台");
  });
}

if (authRegisterForm) {
  authRegisterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(authRegisterForm);
    const phone = String(data.get("phone") || "").trim();
    const smsCode = String(data.get("smsCode") || "").trim();
    if (!isValidPhone(phone)) {
      toast("请输入有效的 11 位手机号");
      return;
    }
    if (!pendingSmsCode || smsCode !== pendingSmsCode) {
      toast("验证码不正确，请先获取并输入 6 位验证码");
      return;
    }
    const avatarFile = data.get("avatar");
    const avatar = avatarFile && avatarFile.size ? await fileToDataUrl(avatarFile) : "";
    setCurrentUser({
      username: data.get("username"),
      contact: data.get("contact"),
      phone,
      organization: data.get("organization"),
      department: data.get("department"),
      title: data.get("title"),
      password: data.get("password"),
      avatar,
      role: "数据采集用户",
    });
    saveUserProfile();
    addUserHistory("注册", `${currentUserProfile.contact} 完成账号注册`);
    setAuthenticated(true);
    toast("注册成功，已进入工作台");
  });
}

if (sendSmsCodeButton) {
  sendSmsCodeButton.addEventListener("click", () => {
    const phoneInput = authRegisterForm?.querySelector('[name="phone"]');
    const phone = phoneInput?.value.trim();
    if (!isValidPhone(phone)) {
      toast("请先输入有效手机号");
      return;
    }
    pendingSmsCode = String(Math.floor(100000 + Math.random() * 900000));
    const codeInput = authRegisterForm.querySelector('[name="smsCode"]');
    if (codeInput) codeInput.value = pendingSmsCode;
    sendSmsCodeButton.textContent = "已发送";
    toast(`演示验证码：${pendingSmsCode}`);
  });
}

if (tciaLogoutButton) {
  tciaLogoutButton.addEventListener("click", () => {
    addUserHistory("退出", `${currentUserProfile.contact || currentUserProfile.username} 退出工作台`);
    setAuthenticated(false);
    toast("已退出登录");
  });
}

[tciaProfileTrigger, tciaUserTextButton].forEach((button) => {
  if (!button) return;
  button.addEventListener("click", openProfileModal);
});

imageGrid.addEventListener("click", async (event) => {
  const preview = event.target.closest("[data-preview-id]");
  if (preview) {
    openPreview(preview.dataset.previewId);
    return;
  }
  const download = event.target.closest("[data-download-id]");
  if (download) {
    await downloadUploadPreview(download.dataset.downloadId);
    return;
  }
  const check = event.target.closest(".upload-check");
  if (check) {
    if (check.checked) selectedUploadIds.add(check.dataset.uploadId);
    else selectedUploadIds.delete(check.dataset.uploadId);
    renderUploadViews();
    return;
  }
  const button = event.target.closest(".delete-file");
  if (!button) return;
  deleteUpload(button.dataset.uploadId);
});

if (uploadList) {
  uploadList.addEventListener("click", async (event) => {
    const preview = event.target.closest("[data-preview-id]");
    if (preview) {
      openPreview(preview.dataset.previewId);
      return;
    }
    const download = event.target.closest("[data-download-id]");
    if (download) {
      await downloadUploadPreview(download.dataset.downloadId);
      return;
    }
    const check = event.target.closest(".upload-check");
    if (check) {
      if (check.checked) selectedUploadIds.add(check.dataset.uploadId);
      else selectedUploadIds.delete(check.dataset.uploadId);
      renderUploadViews();
      return;
    }
    const button = event.target.closest(".delete-file");
    if (!button) return;
    deleteUpload(button.dataset.uploadId);
  });
}

document.querySelectorAll(".report-files, #reportAllFiles").forEach((container) => {
  container.addEventListener("click", async (event) => {
    const preview = event.target.closest("[data-preview-id]");
    if (preview) {
      openPreview(preview.dataset.previewId);
      return;
    }
    const download = event.target.closest("[data-download-id]");
    if (download) {
      await downloadUploadPreview(download.dataset.downloadId);
      return;
    }
    const check = event.target.closest(".upload-check");
    if (check) {
      if (check.checked) selectedUploadIds.add(check.dataset.uploadId);
      else selectedUploadIds.delete(check.dataset.uploadId);
      renderUploadViews();
      return;
    }
    const button = event.target.closest(".delete-file");
    if (!button) return;
    deleteUpload(button.dataset.uploadId);
  });
});

statusCards.forEach((card) => {
  card.addEventListener("click", () => {
    activeStatus = card.dataset.status;
    statusCards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");
    selectedIds.clear();
    renderRows();
  });
});

if (queryButton) {
  queryButton.addEventListener("click", () => {
    activeQuery = keywordInput?.value.trim() || "";
    queryApplied = true;
    selectedIds.clear();
    renderRows();
    toast("查询已完成，命中内容已在列表中标出");
  });
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    if (partFilter) partFilter.value = "全部";
    if (orgFilter) orgFilter.value = "全部";
    if (hiddenFilter) hiddenFilter.value = "全部";
    if (keywordInput) keywordInput.value = "";
    activeQuery = "";
    queryApplied = false;
    selectedIds.clear();
    renderRows();
    toast("筛选条件已重置");
  });
}

if (caseSelector) {
  caseSelector.addEventListener("change", () => selectCaseById(caseSelector.value));
}

if (uploadCaseSelector) {
  uploadCaseSelector.addEventListener("change", () => selectCaseById(uploadCaseSelector.value, { panel: "uploadPanel" }));
}

if (reportCaseSelector) {
  reportCaseSelector.addEventListener("change", () => selectCaseById(reportCaseSelector.value, { panel: "reportPanel" }));
}

if (keywordInput) {
  keywordInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    queryButton?.click();
  });
}

rows.addEventListener("click", (event) => {
  const check = event.target.closest(".case-check");
  if (check) {
    if (check.checked) selectedIds.add(check.dataset.id);
    else selectedIds.delete(check.dataset.id);
    updateSelectedCount();
    return;
  }
  const target = event.target.closest("[data-id]");
  if (!target) return;
  const found = cases.find((item) => item.id === target.dataset.id);
  if (!found) return;
  updateDetail(found);
  renderRows();
  showPanel("casePanel");
});

if (selectAllCases) {
  selectAllCases.addEventListener("change", () => {
    document.querySelectorAll(".case-check").forEach((input) => {
      input.checked = selectAllCases.checked;
      if (input.checked) selectedIds.add(input.dataset.id);
      else selectedIds.delete(input.dataset.id);
    });
    updateSelectedCount();
  });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setCaseTab(tab.dataset.tab));
});

document.querySelectorAll(".mini-tab").forEach((tab) => {
  tab.addEventListener("click", () => setScan(tab.dataset.scan));
});

document.querySelectorAll(".upload-button").forEach((button) => {
  button.addEventListener("click", () => {
    uploadTarget = button.dataset.upload || button.textContent.trim();
    uploadCategory = button.dataset.scan || button.dataset.category || "report";
    if (button.dataset.scan) setScan(button.dataset.scan);
    if (fileInput) {
      fileInput.value = "";
      fileInput.click();
    }
    toast(`准备上传：${uploadTarget}`);
  });
});

document.querySelector("#pickFiles").addEventListener("click", () => {
  uploadTarget = scanTypes[activeScan].title;
  uploadCategory = activeScan;
  fileInput.value = "";
  fileInput.click();
});

fileInput.addEventListener("change", () => addFiles(fileInput.files));

["dragenter", "dragover"].forEach((type) => {
  uploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    uploadZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((type) => {
  uploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("dragging");
  });
});

uploadZone.addEventListener("drop", (event) => {
  uploadTarget = scanTypes[activeScan].title;
  uploadCategory = activeScan;
  addFiles(event.dataTransfer.files);
});

document.querySelectorAll(".top-actions button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.action === "new-case") openNewCaseModal();
    if (button.dataset.action === "messages") openMessagesModal();
    if (button.dataset.action === "export") exportCases();
    if (button.dataset.action === "logout") {
      setAuthenticated(false);
      toast("已退出登录");
    }
  });
});

document.querySelectorAll(".panel-head button, .review-bar button").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "download-template") downloadTemplate();
    else if (action === "download-report-template") downloadReportTemplate();
    else if (action === "export-ledger") exportLedger();
    else if (action === "export-patient-report") exportPatientReport();
    else if (action === "open-case-upload") openCaseUpload();
    else if (action === "batch-export") exportSelectedCases();
    else if (action === "batch-store") batchStore();
    else if (action === "store-current") storeCurrentCase();
    else if (button.dataset.review) reviewCurrentCase(button.dataset.review);
    else if (button.textContent.includes("导出")) exportCases();
    else toast(`${button.textContent.trim()} 已响应`);
  });
});

modalBackdrop.addEventListener("click", async (event) => {
  const download = event.target.closest("[data-download-id]");
  if (download) {
    await downloadUploadPreview(download.dataset.downloadId);
    return;
  }
  if (event.target === modalBackdrop || event.target.closest(".modal-close") || event.target.closest(".modal-cancel")) closeModal();
});

modalBackdrop.addEventListener("submit", async (event) => {
  const profileForm = event.target.closest("#profileForm");
  if (profileForm) {
    event.preventDefault();
    const data = new FormData(profileForm);
    const phone = String(data.get("phone") || "").trim();
    if (!isValidPhone(phone)) {
      toast("请输入有效手机号");
      return;
    }
    const avatarFile = data.get("avatar");
    const avatar = avatarFile && avatarFile.size ? await fileToDataUrl(avatarFile) : currentUserProfile.avatar;
    setCurrentUser({
      username: data.get("username"),
      contact: data.get("contact"),
      phone,
      organization: data.get("organization"),
      department: data.get("department"),
      title: data.get("title"),
      avatar,
    });
    saveUserProfile();
    addUserHistory("资料更新", "编辑个人基本信息");
    closeModal();
    toast("个人资料已保存");
    return;
  }
  const form = event.target.closest("#newCaseForm");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  caseCounter += 1;
  const item = {
    id: `CASE-2026-${String(caseCounter).padStart(3, "0")}`,
    name: `病例${caseCounter}`,
    age: Number(data.get("age")),
    org: data.get("org"),
    part: data.get("part"),
    status: "待初审",
    progress: 20,
    diagnosis: data.get("diagnosis"),
    hidden: false,
    uploads: [],
  };
  cases.unshift(item);
  selectedCase = item;
  activeStatus = "待初审";
  statusCards.forEach((card) => card.classList.toggle("active", card.dataset.status === activeStatus));
  saveDatabase();
  renderRows();
  updateDetail(item);
  closeModal();
  toast("新病例已创建");
});

function exportSelectedCases() {
  const list = cases.filter((item) => selectedIds.has(item.id));
  if (!list.length) {
    toast("请先选择需要导出的病例");
    return;
  }
  const header = ["编号", "病例", "年龄", "机构", "检查部位", "状态", "完整度", "上传文件数"];
  const lines = list.map((item) => [item.id, item.name, item.age, item.org, item.part, item.status, `${item.progress}%`, item.uploads.length].join(","));
  downloadTextFile("卵巢平台选中病例.csv", [header.join(","), ...lines].join("\n"));
  toast(`已导出 ${list.length} 条选中病例`);
}

function batchStore() {
  const list = cases.filter((item) => selectedIds.has(item.id));
  if (!list.length) {
    toast("请先选择需要入库的数据");
    return;
  }
  list.forEach((item) => {
    item.status = "已入库";
    item.progress = 100;
    item.uploads.forEach((file) => {
      file.stored = true;
      file.reviewStatus = "已入库";
    });
  });
  saveDatabase();
  activeStatus = "已入库";
  statusCards.forEach((card) => card.classList.toggle("active", card.dataset.status === activeStatus));
  selectedIds.clear();
  renderRows();
  if (list.some((item) => item.id === selectedCase.id)) updateDetail(selectedCase);
  toast(`已入库 ${list.length} 条数据`);
}

function reviewCurrentCase(status) {
  if (selectedUploadIds.size) {
    selectedCase.uploads.forEach((file) => {
      if (!selectedUploadIds.has(file.id)) return;
      file.reviewStatus = status;
      file.stored = status === "已入库";
    });
    selectedUploadIds.clear();
    saveDatabase();
    updateDetail(selectedCase);
    renderRows();
    toast(`选中文件已更新为：${status}`);
    return;
  }
  selectedCase.status = status;
  if (status === "已入库") {
    selectedCase.progress = 100;
    selectedCase.uploads.forEach((file) => {
      file.stored = true;
      file.reviewStatus = "已入库";
    });
  }
  activeStatus = status;
  statusCards.forEach((card) => card.classList.toggle("active", card.dataset.status === activeStatus));
  saveDatabase();
  updateDetail(selectedCase);
  renderRows();
  toast(`${selectedCase.id} 已更新为：${status}`);
}

initializeAuthGate();
renderRows();
updateDetail(selectedCase);
setScan(activeScan);

// Bridge the TCIA-style masthead navigation to the original app navigation.
document.querySelectorAll('.tcia-nav [data-panel]').forEach((button) => {
  button.addEventListener('click', () => {
    const panel = button.dataset.panel;
    const tabJump = button.dataset.tabJump;
    const original = document.querySelector(`.site-nav [data-panel="${panel}"]${tabJump ? `[data-tab-jump="${tabJump}"]` : ''}`) ||
      document.querySelector(`.nav-list [data-panel="${panel}"]`);
    if (original) original.click();
    document.querySelectorAll('.tcia-nav [data-panel]').forEach((item) => item.classList.toggle('active', item === button));
  });
});

// Direct bridge for the TCIA-style masthead navigation.
document.querySelectorAll('.tcia-nav [data-panel]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const panel = button.dataset.panel;
    if (typeof showPanel === 'function') showPanel(panel);
    if (button.dataset.tabJump && typeof setCaseTab === 'function') setCaseTab(button.dataset.tabJump);
    document.querySelectorAll('.tcia-nav [data-panel]').forEach((item) => item.classList.toggle('active', item === button));
  });
});
