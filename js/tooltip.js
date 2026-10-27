export default function initTooltip(el) {
  let bRect, tRect;

  const tooltip = d3.select(el).append("div").attr("class", "tooltip");

  function show(content) {
    tooltip.html(content).classed("is-visible", true);

    bRect = el.getBoundingClientRect();
    tRect = tooltip.node().getBoundingClientRect();
  }

  function move(event) {
    const [mx, my] = d3.pointer(event, el);

    let x = mx - tRect.width / 2;
    if (x < 0) {
      x = 0;
    } else if (x + tRect.width > bRect.width) {
      x = bRect.width - tRect.width;
    }

    let y = my - 16 - tRect.height;
    if (y < 0) {
      y = my + 16;
      if (y + tRect.height > bRect.height) {
        y = bRect.height - tRect.height;
      }
    }

    tooltip.style("transform", `translate(${x}px,${y}px)`);
  }

  function hide() {
    tooltip.classed("is-visible", false);
  }

  return {
    show,
    move,
    hide,
  };
}
