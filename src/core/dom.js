export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.value !== undefined) node.value = options.value;
  if (options.title) node.title = options.title;
  if (options.placeholder) node.placeholder = options.placeholder;
  if (options.attrs) for (const [key, value] of Object.entries(options.attrs)) if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  if (options.dataset) Object.assign(node.dataset, options.dataset);
  if (options.style) Object.assign(node.style, options.style);
  if (options.on) for (const [event, handler] of Object.entries(options.on)) node.addEventListener(event, handler);
  if (options.disabled !== undefined) node.disabled = options.disabled;
  if (options.hidden !== undefined) node.hidden = options.hidden;
  for (const child of (Array.isArray(children) ? children : [children])) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
const ICONS = {
  plus:'<path d="M12 5v14M5 12h14"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/>',
  external:'<path d="M14 3h7v7M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
  expand:'<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3"/>',
  grid:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-7 5-5 5 5m-5-5v12"/>',
  pause:'<path d="M10 5H6v14h4zM18 5h-4v14h4z"/>',
  play:'<path d="m7 4 13 8-13 8z"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>'
};
export function icon(name, className = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox","0 0 24 24"); svg.setAttribute("aria-hidden","true");
  svg.setAttribute("class",`icon ${className}`.trim()); svg.setAttribute("fill","none");
  svg.setAttribute("stroke","currentColor"); svg.setAttribute("stroke-width","1.8");
  svg.setAttribute("stroke-linecap","round"); svg.setAttribute("stroke-linejoin","round");
  const group = document.createElementNS("http://www.w3.org/2000/svg","g");
  group.innerHTML = ICONS[name] || ICONS.info; svg.append(group); return svg;
}