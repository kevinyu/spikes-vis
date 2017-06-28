// Algorithm shamelessly stolen and translated line by line from
// http://nicky.vanforeest.com/misc/fitEllipse/fitEllipse.html

math.argmax = function(arr) {
  return arr.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
};

function fitEllipse(points) {
  var x = [];
  var y = [];
  points.forEach(d => {
    x.push(d[0]);
    y.push(d[1]);
  })

  var D = math.transpose([
    math.dotMultiply(x, x),
    math.dotMultiply(x, y),
    math.dotMultiply(y, y),
    x,
    y,
    math.ones(x.length)
  ])

  var S = math.multiply(math.transpose(D), D);
  var C = math.zeros([6, 6]);
  C[0][2] = 2;
  C[2][0] = 2;
  C[1][1] = -1;
  var eig = numeric.eig(math.multiply(numeric.inv(S), C));
  n = math.argmax(eig.lambda.x);
  var result = math.transpose(eig.E.x)[n];
  return {
    a: result[0],
    b: result[1] / 2,
    c: result[2],
    d: result[3] / 2,
    f: result[4] / 2,
    g: result[5]
  }
}

function ellipseCenter(p) {
  var a = p.a, b = p.b, c = p.c, d = p.d, f = p.f, g = p.g;
  const num = b * b - a * c;
  const x0 = (c * d - b * f) / num;
  const y0 = (a * f - b * d) / num;
  return {x: x0, y: y0};
}

function ellipseAngle(p) {
  var a = p.a, b = p.b, c = p.c, d = p.d, f = p.f, g = p.g;
  return 0.5 * math.atan(2 * b / (a - c));
}

function ellipseAxes(p) {
  var a = p.a, b = p.b, c = p.c, d = p.d, f = p.f, g = p.g;
  const up = 2 * (a * math.square(f) +
    c * math.square(d) +
    g * math.square(b) -
    2 * b * d * f -
    a * c * g)
  const A = math.square(b) - a * c;
  const B = math.sqrt(1 + 4 * math.square(b) / math.square(a - c))
  const down1 = A * ((c - a) * B - (c + a));
  const down2 = A * ((a - c) * B - (c + a));
  return {
    a: math.sqrt(up / down1),
    b: math.sqrt(up / down2)
  }
}
