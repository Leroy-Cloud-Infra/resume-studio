export function calculateTextareaHeight(contentHeight: number, minHeight: number, maxHeight: number) {
  const nextHeight = Math.max(minHeight, contentHeight);
  return maxHeight > 0 ? Math.min(nextHeight, maxHeight) : nextHeight;
}

export function measureTextareaContentHeight(textarea: HTMLTextAreaElement) {
  const clone = textarea.cloneNode(false) as HTMLTextAreaElement;
  const host = textarea.parentElement ?? document.body;

  clone.value = textarea.value;
  clone.setAttribute("aria-hidden", "true");
  clone.tabIndex = -1;
  clone.style.position = "fixed";
  clone.style.top = "0px";
  clone.style.left = "-100000px";
  clone.style.width = `${textarea.getBoundingClientRect().width}px`;
  clone.style.height = "auto";
  clone.style.minHeight = "0px";
  clone.style.maxHeight = "none";
  clone.style.overflow = "hidden";
  clone.style.resize = "none";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";

  host.append(clone);

  try {
    return clone.scrollHeight;
  } finally {
    clone.remove();
  }
}
