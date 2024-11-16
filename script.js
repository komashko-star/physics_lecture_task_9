var charges = [];
var MAX_X_DOMAIN = 10;
var k = 9 * Math.pow(10, 9);

var arrowDensity = 30;
var arrowLength = 30;

var color_gradient_start = 0;
var color_gradient_finish = 40;
  

var border = null;

const defaultChargeValues = [0, 0, 1, -9];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRainbowColor(value) {
  value = (clamp(value, color_gradient_start, color_gradient_finish) - color_gradient_start) /
    (color_gradient_finish - color_gradient_start);

  value = clamp(value, 0, 1);

  const angle = value * 300;

  return "hsl(" + Math.round(angle) + " 80 50)";
}


function round(number, a) {
  if (a > 0) {
    return (number).toFixed(a);
  } else if (a == 0) {
    return Math.round(number);
  } else {
    let r = number % Math.pow(10, -a);

    if (r / Math.pow(10, -a) > 0.5) {
      return number - number % Math.pow(10, -a);
    } else {
      return number - number % Math.pow(10, -a) + 1;
    }

  }
}

function digitnumber(number) {
  let a = 0;
  if (number == 0) {
    return 0;
  }
  number = Math.abs(number);
  if (number > 1) {
    while (number > 10) {
      number /= 10;
      a++;
    }
    return a;
  }
  while (number < 1) {
    number *= 10;
    a--;
  }
  return a;
}

function to_scientific_notation(number) {
  exponent = digitnumber(number);
  if (exponent != 0 && exponent != 1) {
    number = number * Math.pow(10, -exponent);
  }

  let string = round(number, 3);
  if (exponent != 0 && exponent != 1) {
    string += ' x 10^(' + exponent + ')';
  }
  return string;
}


const EPSILON = 0.01;


function innerSizes(node) {
  var computedStyle = getComputedStyle(node);

  let width = node.clientWidth;
  let height = node.clientHeight;
  
  width -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
  height -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
  return [width, height];
}

class Border {
  constructor(id){
    this.id = id;
    this.DOMObject = document.getElementById(this.id);

    this.x_domain_start = -MAX_X_DOMAIN;
    this.x_domain = MAX_X_DOMAIN;
    this.width = innerSizes(this.DOMObject)[0];
    this.height = innerSizes(this.DOMObject)[1];
    this.y_domain_start = -this.height / this.width * MAX_X_DOMAIN;
    this.y_domain = this.height / this.width * MAX_X_DOMAIN;
  }
  getDOMObject(){
    this.DOMObject = document.getElementById(this.id);
    return this.DOMObject;
  }
}

function createHiPPICanvas(canvas, width, height) {
  const ratio = window.devicePixelRatio;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = (width) + "px";
  canvas.style.height = (height - 6) + "px";
  canvas.getContext("2d").scale(ratio, ratio);

  return canvas;
}

function canvasToModelCoords(i, j) {
  return [
    i / border.width * (border.x_domain - border.x_domain_start) + border.x_domain_start,
    (border.height - j) / border.height * (border.y_domain - border.y_domain_start) + border.y_domain_start
  
  ];
}

function modelToCanvasCoords(x, y) {
  return [
    (x - border.x_domain_start) / (border.x_domain - border.x_domain_start) * border.width,
    border.height - (y - border.y_domain_start) / (border.y_domain - border.y_domain_start) * border.height
  ]
}

function calculateFieldStrength(x, y) {
  let vector = [0, 0];

  for (var i = 0; i < charges.length; i++) {
    let [x_q, y_q, q] = charges[i];

    let r = [x - x_q, y - y_q];
    let r_length = Math.hypot(r[0], r[1]);

    let E_q = k * q / Math.pow(r_length, 3);

    vector = [vector[0] + E_q * r[0], vector[1] + E_q * r[1]];
  }

  return vector;
}

function drawVector(ctx, x, y, E_vector) {
  let arrowSize = 10;
  let E_vector_length = Math.hypot(E_vector[0], E_vector[1]);

  let [fromX, fromY] = modelToCanvasCoords(x, y);
  let [toX, toY] = modelToCanvasCoords(E_vector[0] + x, E_vector[1] + y);

  let vector = [toX - fromX, toY - fromY];
  let vectorLength = Math.hypot(vector[0], vector[1]);
  vector = [Math.round(vector[0] * arrowLength / vectorLength), Math.round(vector[1] * arrowLength / vectorLength)];

  [toX, toY] = [fromX + vector[0], fromY + vector[1]]

  const angle = Math.atan2(toY - fromY, toX - fromX);

  let color = getRainbowColor(E_vector_length);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
      toX - arrowSize * Math.cos(angle - Math.PI / 6),
      toY - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
      toX - arrowSize * Math.cos(angle + Math.PI / 6),
      toY - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.lineTo(toX, toY);
  ctx.closePath();
  ctx.fill();
}

function redraw() {
  let chartObject = document.getElementById('mainchart');
  createHiPPICanvas(chartObject, border.width, border.height);

  let chartContext = chartObject.getContext('2d');
  chartContext.clearRect(0, 0, chartObject.width, chartObject.height);

  dx = (border.x_domain - border.x_domain_start) / border.width * arrowDensity;
  dy = dx;
  for (let x = border.x_domain_start; x < border.x_domain; x += dx) {
    for (let y = border.y_domain_start; y < border.y_domain; y += dy) {      
      let E_vector = calculateFieldStrength(x, y);
      
      drawVector(chartContext, x, y, E_vector);
    }
  }

  chartContext.fillStyle = 'gray';
  for (var i = 0; i < charges.length; i++) {
    let [i_0, j_0] = modelToCanvasCoords(charges[i][0], charges[i][1]);

    let radius = 5;

    chartContext.beginPath();
    chartContext.arc(i_0, j_0, radius, 0, 2 * Math.PI);
    chartContext.fill();
  }
}


function reloadModel() {
    objects = [];
    border = new Border('border');

    redraw();
}

function collectData() {
  let charges_ = [];

  for (let i = 1; i <= charges.length; i++) { 
    let x_0_ = parseFloat(document.getElementById('x_' + i).value);
    let y_0_ = parseFloat(document.getElementById('y_' + i).value);
    let q_0_ = parseFloat(document.getElementById('q_' + i).value);
    let q_0_exp = parseFloat(document.getElementById('q_' + i + '_exp').value);

    charges_.push([x_0_, y_0_, q_0_ * Math.pow(10, q_0_exp)]);
  }
  
  let arrowDensity_ = parseInt(document.getElementById('arrowdensity').value);  
  if (arrowDensity_ <= 0) {
    window.alert('Плотность стрелок не может быть неположительной');
    return;
  }
  
  let MAX_X_DOMAIN_ = parseFloat(document.getElementById('x_domain').value) / 2;
  if (MAX_X_DOMAIN_ <= 0) {
    window.alert('Ширина области не может быть неположительной');
    return;
  }
  color_gradient_finish = parseFloat(document.getElementById('colorsq5value').value);
  color_gradient_finish *= Math.pow(10, parseInt(document.getElementById('colorsq5exp').value));

  return [charges_, MAX_X_DOMAIN_, arrowDensity_];
}


function reloadForm() {
  let data = collectData();
  if (data == null) {
    return;
  }
  let old_data = [charges, MAX_X_DOMAIN, arrowDensity];
  let are_equal = old_data.length === data.length && old_data.every(function(value, index) { return value === data[index]});
  if (are_equal){
    document.getElementById('curtain').style.visibility = 'visible';
    redraw();
    document.getElementById('curtain').style.visibility = 'hidden';
    return;
  }
  [charges, MAX_X_DOMAIN, arrowDensity] = data;

  document.getElementById('curtain').style.visibility = 'visible';
  reloadModel();
  document.getElementById('curtain').style.visibility = 'hidden';
}


function showEnergyValue(event) {
  let shower = document.getElementById('chargeshower');
  shower.style.display = 'inline';

  let [x, y] = canvasToModelCoords(event.offsetX, event.offsetY);
  let fieldStrength = calculateFieldStrength(x, y);
  let fieldStrengthLength = Math.hypot(fieldStrength[0], fieldStrength[1]);
  
  shower.innerHTML = "(" + to_scientific_notation(x) + ' м, ' + to_scientific_notation(y) + " м)<br/>" + 
    "(" + to_scientific_notation(fieldStrength[0]) + ' В/м, ' + to_scientific_notation(fieldStrength[1]) + ' В/м)<br/>' + 
    to_scientific_notation(fieldStrengthLength) + ' В/м';

  let shower_width = getComputedStyle(shower).width;
  shower_width = +(shower_width.slice(0, shower_width.length - 2));

  shower.style.top = event.offsetY + 'px';
  if (shower_width + event.offsetX + 10 > border.width) {
    shower.style.left = event.offsetX - shower_width - 10 + 'px';
  } else {
    shower.style.left = event.offsetX + 10 + 'px';
  }
}

function removeEnergyValue(event) {
  let shower = document.getElementById('chargeshower');
  shower.style.display = 'none';
}

function updateColorGradient(event) {
  color_gradient_finish = parseFloat(document.getElementById('colorsq5value').value);
  color_gradient_finish *= Math.pow(10, parseInt(document.getElementById('colorsq5exp').value));

  for (let i = 1; i <= 4; i++) {
    document.getElementById('colorsq' + i + 'value').innerHTML = 
      to_scientific_notation(color_gradient_start + (i - 1) * (color_gradient_finish - color_gradient_start) / 4);
  }
}

function updateChargesForm() {
  let oneChargeForm = `
            $1 заряд: <br/> 
            
            <label for="x_$1">x<sub>$1</sub></label> = <input type="number" step="0.001" value="$2" id="x_$1" class="exponent_input" required> м;
            <label for="y_$1">y<sub>$1</sub></label> = <input type="number" step="0.001" value="$3" id="y_$1" class="exponent_input" required> м <br/>
                
            <label for="q_$1">q<sub>$1</sub></label> = <input type="number" step="0.001" value="$4" id="q_$1" class="exponent_input" required> x 
            10^<input type="number" step="1" value="$5" id="q_$1_exp" class="exponent_input" required> Кл <br/>
            `

  let removeChargeButton = "<button id=\"removeCharge$1\" type=\"button\">Удалить заряд</button><br/>";

  let chargesForm = document.getElementById('chargesForm');

  chargesForm.innerHTML = "";

  for (let i = 1; i <= charges.length; i++) {
    let number = charges[i - 1][2];

    let exponent = digitnumber(number);
    if (exponent != 0 && exponent != 1) {
      number = number * Math.pow(10, -exponent);
    }
  
    number = round(number, 3);

    chargesForm.innerHTML += oneChargeForm
      .replaceAll("$1", i)
      .replaceAll("$2", charges[i - 1][0])
      .replaceAll("$3", charges[i - 1][1])
      .replaceAll("$4", number)
      .replaceAll("$5", exponent) + '\n';
  
    if (charges.length > 1) {
      chargesForm.innerHTML += removeChargeButton.replaceAll("$1", i);
    }
  }
  if (charges.length > 1) {
    for (let i = 1; i <= charges.length; i++) {
      document.getElementById('removeCharge' + i).addEventListener('click', removeChargeForm);
    }
  }
  
}

function addChargeForm() {
  charges.push([defaultChargeValues[0], defaultChargeValues[1], defaultChargeValues[2] * Math.pow(10, defaultChargeValues[3])]);
  updateChargesForm();
}

function removeChargeForm(event) {
  let n = event.currentTarget.id.slice("removeCharge".length, event.currentTarget.id.length) - 1;

  charges = charges.filter(function(_, i) {
    return i != n;
  });
  updateChargesForm();
}

window.onload = () => {
  let canvas = document.getElementById('mainchart');
  canvas.addEventListener("mousemove", showEnergyValue);
  canvas.addEventListener("mouseleave", removeEnergyValue);

  document.getElementById('colorsq5value').addEventListener('change', updateColorGradient);
  document.getElementById('colorsq5exp').addEventListener('change', updateColorGradient);
  updateColorGradient(1);

  document.getElementById('addCharge').addEventListener('click', addChargeForm);

  addChargeForm();
  updateChargesForm();
  reloadForm();

  document.getElementById('collisionForm').addEventListener('submit', function(event) {
    event.preventDefault();
    reloadForm();
  });

}
