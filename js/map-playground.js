import initTooltip from "./tooltip.js";

export default function mapPlayground({ el, data, usTile, us }) {
  ///////////////////////////////////////////////////////////
  //// Setup ////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  let params, force;
  const width = 1200;
  const height = 800;

  const sizeScale = d3.scaleSqrt();
  const sizeMultipliers = {
    circle: 1,
    square: 1.772 / 2, // sqrt(pi) / 2
  };
  const fontSizeMultiplier = {
    circle: 0.9,
    square: 1,
  };

  const formatValue = d3.format(",d");

  //// Map layout ///////////////////////////////////////////
  // https://github.com/topojson/us-atlas#us-atlas-topojson
  // const mapWidth = 975;
  // const mapHeight = 610;
  const projection = d3.geoAlbersUsa().scale(1300).translate([0, 0]);
  const path = d3.geoPath(projection);

  //// Tile grid layout /////////////////////////////////////
  // https://zhenmao.github.io/comparing-us-grid-maps/ NPR layout
  const cols = d3.range(2, 14); // 12 cols
  const rows = d3.range(1, 9); // 8 rows
  const gridSize = 72;
  const gridGap = 8;
  const gridMapWidth = (gridSize + gridGap) * cols.length - gridGap;
  const gridMapHeight = (gridSize + gridGap) * rows.length - gridGap;
  const xGridScale = d3
    .scaleBand()
    .domain(cols)
    .range([-gridMapWidth / 2, gridMapWidth / 2])
    .padding(gridGap / (gridGap + gridSize));
  const yGridScale = d3
    .scaleBand()
    .domain(rows)
    .range([-gridMapHeight / 2, gridMapHeight / 2])
    .padding(gridGap / (gridGap + gridSize));

  ///////////////////////////////////////////////////////////
  //// Process data /////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const usStateFeatures = topojson.feature(us, us.objects.states).features;
  const featureByState = new Map(
    usStateFeatures.map((d) => [d.properties.name, d]),
  );
  const gridByState = new Map(usTile.map((d) => [d.state, d]));
  const bubbles = data.map((d) => {
    const value = d["Locations"];
    const state = d["State"];
    const code = gridByState.get(state).code;

    const coords = {
      standard: poly2Center(featureByState.get(state)),
      tileGrid: [
        xGridScale(gridByState.get(state).col) + xGridScale.bandwidth() / 2,
        yGridScale(gridByState.get(state).row) + yGridScale.bandwidth() / 2,
      ],
    };

    return {
      value,
      state,
      code,
      coords,
    };
  });

  bubbles.sort((a, b) => d3.descending(a.value, b.value));

  const maxValue = d3.max(bubbles, (d) => d.value);
  sizeScale.domain([0, maxValue]);

  // https://observablehq.com/@neocarto/dorling-vs-demers
  function poly2Center(d) {
    if (d.geometry.type == "MultiPolygon") {
      var best = {};
      var bestArea = 0;
      d.geometry.coordinates.forEach(function (coords) {
        var poly = { type: "Polygon", coordinates: coords };
        var area = d3.geoArea(poly);
        if (area > bestArea) {
          bestArea = area;
          best = poly;
        }
      });
      return path.centroid(best);
    } else {
      return path.centroid(d);
    }
  }

  ///////////////////////////////////////////////////////////
  //// Layout ///////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  function computeLayout() {
    const maxSize = params.symbolSize * sizeMultipliers[params.symbolShape];
    sizeScale.range([0, maxSize]);

    bubbles.forEach((d) => {
      d.size = sizeScale(d.value);
      d.width = d.height = d.size * 2;
      d.rx = d.ry = params.symbolShape === "circle" ? d.size : 0; // circle is drawn as rounded rect
      d.fontSize = d.size * fontSizeMultiplier[params.symbolShape];

      if (d.x === undefined) {
        d.x = d.coords[params.baseMap][0];
        d.y = d.coords[params.baseMap][1];
      }
    });

    if (force) force.stop();
    const forceX = d3.forceX((d) => d.coords[params.baseMap][0]);
    const forceY = d3.forceY((d) => d.coords[params.baseMap][1]);
    let forceCollide;
    if (params.symbolPosition === "avoidOverlapping") {
      forceCollide =
        params.symbolShape === "circle"
          ? d3
              .forceCollide((d) => d.size)
              .strength(1)
              .iterations(2)
          : d3
              .bboxCollide((d) => [
                [-d.size, -d.size],
                [d.size, d.size],
              ])
              .strength(1)
              .iterations(2);
    }

    force = d3.forceSimulation().force("x", forceX).force("y", forceY);
    if (forceCollide) {
      force.force("collide", forceCollide);
    }
    force.nodes(bubbles).on("tick", ticked);
  }

  ///////////////////////////////////////////////////////////
  //// Render ///////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const container = d3.select(el).classed("chart", true);
  const tooltip = initTooltip(el);
  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

  //// Standard map /////////////////////////////////////////
  const standardBaseMapG = svg.append("g").attr("class", "base-map is-hidden");

  standardBaseMapG
    .selectChildren()
    .data(usStateFeatures)
    .join("path")
    .attr("class", "base-map__state")
    .attr("d", path);

  //// Tile grid map ////////////////////////////////////////
  const tileGridBaseMapG = svg.append("g").attr("class", "base-map is-hidden");

  tileGridBaseMapG
    .selectChildren()
    .data(usTile)
    .join("rect")
    .attr("class", "base-map__state")
    .attr("x", (d) => xGridScale(d.col))
    .attr("y", (d) => yGridScale(d.row))
    .attr("width", gridSize)
    .attr("height", gridSize);

  //// Bubble ///////////////////////////////////////////////
  const bubble = svg
    .append("g")
    .attr("class", "bubbles")
    .selectChildren()
    .data(bubbles)
    .join("g")
    .attr("class", "bubble")
    .on("mouseenter", entered)
    .on("mousemove", moved)
    .on("mouseleave", left);

  const bubbleRect = bubble
    .append("rect")
    .attr("class", "bubble__rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", 0)
    .attr("rx", 0)
    .attr("ry", 0);

  const bubbleLabel = bubble
    .append("text")
    .attr("class", "bubble__label")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-size", 0)
    .text((d) => d.code);

  function toggleBaseLayer() {
    standardBaseMapG.classed("is-hidden", params.baseMap !== "standard");
    tileGridBaseMapG.classed("is-hidden", params.baseMap !== "tileGrid");
  }

  function ticked() {
    bubble.attr("transform", (d) => `translate(${d.x},${d.y})`);
  }

  function updateBubbles() {
    const transition = svg.transition();

    bubbleRect
      .transition(transition)
      .attr("x", (d) => -d.size)
      .attr("y", (d) => -d.size)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("rx", (d) => d.rx)
      .attr("ry", (d) => d.ry);

    bubbleLabel.attr("font-size", (d) => d.fontSize);
  }

  ///////////////////////////////////////////////////////////
  //// Interactivity ////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  function entered(event, d) {
    bubble
      .classed("is-active", (e) => e === d)
      .filter((e) => e === d)
      .raise();

    tooltip.show(tooltipContent(d));

    moved(event);
  }

  function moved(event) {
    tooltip.move(event);
  }

  function left() {
    bubble.classed("is-active", false).order();

    tooltip.hide();
  }

  function tooltipContent(d) {
    return /*html*/ `
    <div class="tooltip__title">${d.state}</div>
    <div class="tooltip__value">${formatValue(d.value)}</div>
    `;
  }

  ///////////////////////////////////////////////////////////
  //// Update ///////////////////////////////////////////////
  ///////////////////////////////////////////////////////////

  function updateParams(_) {
    params = _;
    console.log(params);
    toggleBaseLayer();
    computeLayout();
    updateBubbles();
  }

  return { updateParams };
}
