import initMapInputs from "./map-inputs.js";
import mapPlayground from "./map-playground.js";

Promise.all([
  d3.csv("data/data.csv", d3.autoType),
  d3.csv("data/us-tile-grid.csv", d3.autoType),
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
]).then(([data, usTile, us]) => {
  const chart = document.querySelector("#chart");
  const myMapPlayground = mapPlayground({
    el: chart,
    data,
    usTile,
    us,
  });

  const form = document.querySelector("#controls");
  form.addEventListener("selectedchange", (event) => {
    myMapPlayground.updateParams(event.detail);
  });
  initMapInputs(form);
});
