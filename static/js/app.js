'use strict';

function colores_google(n) {
  var colores_g = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
  return colores_g[n % colores_g.length];
}


var pointInPolygon = function (point, vs) {
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
  var xi, xj, i, intersect, yi, yj,
      x = point[0],
      y = point[1],
      inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    xi = vs[i][0],
    yi = vs[i][1],
    xj = vs[j][0],
    yj = vs[j][1],
    intersect = ((yi > y) != (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

/* helper function to search d3.quadtree for points within an ellipse */
function ellipseNearest(node, rx, ry, angle, hits) {
  return function(quad, x1, y1, x2, y2) {
    if (quad.data && (quad.data !== node)) {
      var x = node.x - quad.data.x;
      var y = node.y - quad.data.y;

      if (
        math.square(x * math.cos(angle) + y * math.sin(angle)) / math.square(rx) +
        math.square(x * math.sin(angle) - y * math.cos(angle)) / math.square(ry) < 1
      ) {
        hits.push(quad.data);
      }
    }
    return (
      x1 > node.x + rx ||
      x2 < node.x - rx ||
      y1 > node.y + ry ||
      y2 < node.y - ry
    );
  }
}

/* helper function to search d3.quadtree for points within a CIRCLE */
function nearest(node, radius, hits) {
  return ellipseNearest(node, radius, radius, 0, hits);
}


angular.module('App', [
  'ngRoute',
  'controllers',
  'charts'
])

.config([
  '$routeProvider',
  '$locationProvider',
  function($routeProvider, $locationProvider) {
    // $locationProvider.html5Mode(true);

    $routeProvider
    .when('/', {
      templateUrl: 'static/partials/home.html',
      controller: 'homeController'
    })
    .when('/spikes', {
      templateUrl: 'static/partials/spikes.html',
      controller: 'spikesController'
    })
    .when('/spectrograms', {
      templateUrl: 'static/partials/spectrogram.html',
      controller: 'spectrogramController'
    });
    $routeProvider.otherwise({redirectTo: '/'});
  }
]);


angular.module('controllers', [])

.controller('homeController', function() {
})

.controller('spikesController', [
  '$scope',
  '$http',
  '$q',
  function($scope, $http, $q) {
    var quadtree;
    var getSpikesData;

    $scope.scatterData = [];        // List of points to visualize in scatter plot
    $scope.waveformsLoaded = false;
    $scope.limits = {
      xmax: 10,
      xmin: -10,
      ymax: 10,
      ymin: -10
    };

    var getScatterData = function() {
      $scope.waveformsLoaded = false;
      $scope.groups = [];
      getSpikesData = $http.get(
            'data/scatter'
        ).then(function(data) {
          quadtree.addAll(data.data);
          $scope.scatterData = data.data;
          return data;
        });

      quadtree = d3.quadtree()
        .extent([[-10, 10], [-10, 10]])
        .x(d => d.x)
        .y(d => d.y);

      $q.all([
        getSpikesData,
        $http.get('data/waveforms')
      ]).then(function(results) {
        var waveformData = results[1].data;
        // TODO: in the future should make sure that the id's line up properly
        var datas = [];
        $scope.scatterData.forEach(function(d, i) {
          d.waveform = waveformData[i].waveform;
          datas = datas.concat(d.waveform)
          quadtree.remove(d);
          quadtree.add(d);
        });
        var std = math.std(datas);
        var mean = math.mean(datas);
        $scope.limits = {
          xmin: 0,
          xmax: 32,
          ymin: mean - 4 * std,
          ymax: mean + 4 * std
        };
        $scope.waveformsLoaded = true;
      });

    };

    $scope.groups = [];
    $scope.currentlySelected = [];
    $scope.selectCircle = function(x, y, r) {
      $scope.currentlySelected.splice(0, $scope.currentlySelected.length);
      quadtree.visit(nearest({x: x, y: y}, r, $scope.currentlySelected));
      $scope.$apply()
    }

    // Select an entire ellipse and create a new plot of waveforms
    /*
    $scope.selectEllipse = function(x, y, rx, ry, angle, data) {
      var hits = [];
      quadtree.visit(ellipseNearest({x: x, y: y}, rx, ry, angle, hits));
      $scope.groups.push({
        idx: $scope.groups.length ? $scope.groups[$scope.groups.length - 1].idx + 1 : 0,
        data: hits,
        center: data.center,
        angle: data.angle,
        axes: data.axes
      });
      $scope.$apply();
    }
    */
    $scope.selectEllipse = function(hits, coords) {
      $scope.groups.push({
        idx: $scope.groups.length ? $scope.groups[$scope.groups.length - 1].idx + 1 : 0,
        data: hits,
        coords: coords
      });
      $scope.$apply();
    }

    $scope.close = function(group) {
      const i = $scope.groups.indexOf(group);
      $scope.groups.splice(i, 1);
    }

    getScatterData();
  }
])

.controller('spectrogramController', [
  '$scope',
  '$http',
  '$q',
  function($scope, $http, $q) {
    var quadtree;

    $scope.data = null;             // Currently visualized spectrogram
    $scope.scatterData = [];        // List of points to visualize in scatter plot
    $scope.idx = 0;                 // Currently spectrogram index to visualize
    $scope.loading = false;         // Loading flag (server will be slow when first loading spectrograms files)
    $scope.groups = [];

    // Load a single spectrogram's data
    var getSpecData = function() {
      $http.get('data/spectrograms/' + $scope.idx)
        .then(function(data) {
          $scope.data = data.data.spectrogram;
          return data;
        });
    };

    // Load scatter plot 2d data for current dataset
    var getScatterData = function() {
      $http.get('data/scatter').then(function(data) {
        // TODO fillin max and min
        quadtree = d3.quadtree()
          .extent([[-30, 30], [-30, 30]])
          .x(d => d.x)
          .y(d => d.y);
        quadtree.addAll(data.data);
        $scope.scatterData = data.data;
        return data;
      });
    };

    // Allow up and down keys to scroll through spectrograms
    $scope.onKeyUp = function(evt) {
      if (evt.keyCode === 40) {
        --$scope.idx;
      } else if (evt.keyCode === 38) {
        ++$scope.idx;
      }
    }

    // Request new spectrogram when new datapoint selected
    $scope.$watch('idx', function() {
      if ($scope.idx === 0 || !!$scope.idx) getSpecData();
    });

    // Called when mouse moves over the scatter plot to visualize nearest spectrogram
    $scope.selectCircle = function(x, y, r) {
      var closest = quadtree.find(x, y);
      if (!!closest) $scope.idx = closest.idx;
      $scope.$apply()
    }
    /*
    $scope.selectEllipse = function(x, y, rx, ry, angle, data) {
      var hits = [];
      quadtree.visit(ellipseNearest({x: x, y: y}, rx, ry, angle, hits));
      $scope.indiciesInEllipse = math.sort(hits.map(d => d.idx));
      $scope.groups = [{
        idx: $scope.groups.length ? $scope.groups[$scope.groups.length - 1].idx + 1 : 0,
        data: hits,
        center: data.center,
        angle: data.angle,
        axes: data.axes
      }];
      $scope.$apply();
    }
    */

    $scope.selectEllipse = function(hits, coords) {
      $scope.indiciesInEllipse = hits.map(d => d.idx);
      $scope.groups = [{
        idx: $scope.groups.length ? $scope.groups[$scope.groups.length - 1].idx + 1 : 0,
        data: hits,
        coords: coords
      }];
      $scope.$apply();
    };

    getScatterData();
  }
]);


angular.module('charts', [])

.directive('heatmapChart', function() {
  return {
    restrict: 'E',
    templateUrl: 'static/partials/heatmap_chart.html',
    scope: {
      data: '=',
      nSamples: '@',
      width: '@',
      height: '@',
      horizMargin: '@',
      vertMargin: '@'
    },
    link: function(scope, element, attrs) {
      var _canvas = element[0].querySelector('.real-canvas');
      var canvas = d3.select(_canvas);
      var context = _canvas.getContext('2d');

      var dummyCanvas = element[0].querySelector('#dummy-canvas');
      var dummyContext = dummyCanvas.getContext("2d");

      var i0 = d3.interpolateHsvLong(d3.hsv(120, 1, 0), d3.hsv(120, 1, 0.50)),
          i1 = d3.interpolateHsvLong(d3.hsv(120, 1, 0.50), d3.hsv(120, 0, 1.0)),
          interpolateTerrain = function(t) { return t < 0.5 ? i0(t * 2) : i1((t - 0.5) * 2); };

      function render(data) {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        dummyContext.clearRect(0, 0, dummyContext.canvas.width, dummyContext.canvas.height);
        var color = d3.scaleSequential(interpolateTerrain).domain([20, 80]);
        var n = data[0].length;
        var m = data.length;

        var image = context.createImageData(n, m);
        for (var i = m - 1, l = 0; i >= 0; --i) {
          for (var j = 0; j < n; ++j, l += 4) {
            var c = d3.rgb(color(data[i][j]));
            image.data[l + 0] = c.g;
            image.data[l + 1] = c.r;
            image.data[l + 2] = c.b;
            image.data[l + 3] = 255;
          }
        }
        dummyContext.putImageData(image, 0, 0);
        context.scale(2.0, 1.4);
        context.drawImage(dummyCanvas, 0, 0);
        context.scale(1 / 2.0, 1 / 1.4);
      };

      scope.$watchCollection(function() {
        return scope.data;
      }, function(data) {
        if (!!data && !!data.length) {
          render(data);
        }
      });
    }
  };
})


.directive('waveformsChart', function() {
  return {
    restrict: 'E',
    templateUrl: 'static/partials/waveforms_chart.html',
    scope: {
      data: '=',
      nSamples: '@',
      width: '@',
      height: '@',
      horizMargin: '@',
      vertMargin: '@',
      loaded: '=',
      useCanvas: '@',
      closeable: '@',
      axisBuffer: '@',
      limits: '='
    },
    link: function(scope, element, attrs) {
      var _canvas = element[0].querySelector('canvas');
      var canvas = d3.select(_canvas);
      var context = _canvas.getContext('2d');

      var svg = d3.select(element[0].querySelector('svg'));
      var width = scope.width - 2 * scope.horizMargin;
      var height = scope.height - 2 * scope.vertMargin;

      var scales = {
        x: d3.scaleLinear()
          .domain([scope.limits.xmin, scope.limits.xmax])
          .range([0, width]),
        y: d3.scaleLinear()
          .domain([scope.limits.ymin, scope.limits.ymax])
          .range([height, 0])
      };

      scope.$watch('limits', function(limits) {
        scales = {
          x: d3.scaleLinear()
            .domain([limits.xmin, limits.xmax])
            .range([0, width]),
          y: d3.scaleLinear()
            .domain([limits.ymin, limits.ymax])
            .range([height, 0])
        };
      });

      var yAxis = d3.axisLeft(scales.y);
      svg.append("g")
        .attr("class", "yaxis")
        .attr("transform", "translate(" + scope.axisBuffer + ", 0)")
        .call(yAxis);

      var line = d3.line()
        .x((d, i) => scales.x(i))
        .y(d => scales.y(d))
        .curve(d3.curveBasis);

      var plotGroup = svg.append('g').attr("transform", "translate(" + scope.axisBuffer + ", 0)");

      scope.$watchCollection(function() {
        return scope.data;
      }, function(data) {
        if (!scope.loaded) {
          return;
        }
        if (!!scope.closeable) {
          var rect = svg.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 20)
            .attr('height', 20)
            .attr('fill', 'gray')
            .on('click', function(d) {
              console.log(d);
            });
          rect.append('text').text('X');
        }

        yAxis = d3.axisLeft(scales.y);
        svg.select(".yaxis")
          .call(yAxis);  

        if (!scope.useCanvas) {
          var lines = plotGroup.selectAll('path')
            .data(data, d => d.idx)
          lines.enter().append('path')
            .attr('stroke', d => colores_google(d.cluster))
            .datum(d => d.waveform)
            .attr('class', 'line')
            .attr('d', line)
          lines.exit().remove();
        } else {
          context.clearRect(0, 0, context.canvas.width, context.canvas.height);
          data.forEach(lineData => {
            var waveform = lineData.waveform;
            context.beginPath();
            context.globalAlpha = 0.1;
            context.moveTo(scales.x(0) + scope.axisBuffer, scales.y(waveform[0]));
            waveform.forEach((datapoint, i) => {
              if (i > 0) {
                // Why do i need to hard code 50 here instead of use scope.axisBuffer?
                context.lineTo(scales.x(i) + 50, scales.y(waveform[i]));
              }
            });

            context.lineWidth = 1;
            context.strokeStyle = 'black';
            context.stroke();
          });
        }
      });
    }
  }
})

.directive('interactiveScatter', ['$http', function($http) {
  return {
    restrict: 'E',
    templateUrl: 'static/partials/interactive_scatter.html',
    scope: {
      data: '=',
      width: '@',
      height: '@',
      horizMargin: '@',
      vertMargin: '@',
      selectCircle: '=',
      selectEllipse: '=',
      selectedGroups: '='
    },
    link: function(scope, element, attrs) {
      var svg = d3.select(element[0].querySelector('svg'));
      var _canvas = element[0].querySelector('canvas');
      var canvas = d3.select(_canvas);
      var context = _canvas.getContext('2d');
      var width = scope.width - 2 * scope.horizMargin;
      var height = scope.height - 2 * scope.vertMargin;
      var limits = {};
      var scales;

      var fakeContainer = document.createElement('custom');
      var container = d3.select(fakeContainer);

      var radiusCircle = svg.append('g')
        .append('ellipse')
        .classed('radius', true)

      var lassos = svg.append('g')

      var line = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveBasis);

      var lassoLine = svg.select('path');

      scope.$watch('data', function() {
        limits = {
          xmax: d3.max(scope.data.map(d => d.x)) * 1.1,
          xmin: d3.min(scope.data.map(d => d.x)) * 1.1,
          ymax: d3.max(scope.data.map(d => d.y)) * 1.1,
          ymin: d3.min(scope.data.map(d => d.y)) * 1.1
        };

        scales = {
          x: d3.scaleLinear()
            .domain([limits.xmin, limits.xmax])
            .range([0, width]),
          y: d3.scaleLinear()
            .domain([limits.ymin, limits.ymax])
            .range([height, 0])
        };

        draw(scope.data);
      });

      function draw(data) {
        container.selectAll('c.circle').remove();
        var circles = container.selectAll('c.circle')
          .data(data, d => d.idx);

        circles.enter()
          .append('c')
          .classed('circle', true)
          .attr('fillStyle', d => colores_google(d.cluster))
          .attr('size', 2.0)
          .attr('alpha', 0.8)
          .attr('x', d => scales.x(d.x))
          .attr('y', d => scales.y(d.y));

        circles.exit()
          .remove();

        render()
      }

      function render() {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        var elements = container.selectAll('c.circle');

        elements.each(function(d) {
          var node = d3.select(this);

          context.beginPath();
          context.fillStyle = node.attr('fillStyle');
          context.globalAlpha = node.attr('alpha');
          context.moveTo(node.attr('x'), node.attr('y'));
          context.arc(node.attr('x'), node.attr('y'), node.attr('size'), 0, 2 * Math.PI, false);
          context.fill();
        });
      }

      function moveMouse(mouse) {
        var mouse = {
          x: scales.x.invert(mouse[0]),
          y: scales.y.invert(mouse[1])
        }

        if (!!lassoing) {
          lassoPath.push(mouse);
        }

        var RADIUS = 20;

        radiusCircle
          .attr('cx', scales.x(mouse.x))
          .attr('cy', scales.y(mouse.y))
          .attr('rx', RADIUS)
          .attr('ry', RADIUS);

        const r = scales.x.invert(RADIUS) - scales.x.domain()[0];
        scope.selectCircle(mouse.x, mouse.y, r);
      }

      /* lasso code */
      var lassoPath = [];
      var lassoing = false;
      var active = null;

      var dragline = d3.line()
        .curve(d3.curveBasis);

      canvas.call(d3.drag()
        .container(function() { return this; })
        .subject(function() {var p = [d3.event.x, d3.event.y]; return [p, p];})
        .on('start', dragstarted));

      canvas.on('click', function() {
        if (active !== null) {
          active.remove();
        }
      });

      function dragstarted() {
        if (!scope.data) {
          return;
        }

        if (active !== null) {
          active.remove();
        }
        var coords = [];
        var d = d3.event.subject,
          x0 = d3.event.x,
          y0 = d3.event.y;

        active = svg.append('path').datum(d)

        d3.event.on('drag', function() {
          var x1 = d3.event.x;
          var y1 = d3.event.y;
          moveMouse([x1, y1]);
          coords.push([scales.x.invert(x1), scales.y.invert(y1)]);
          var dx = x1 - x0;
          var dy = y1 - y0;

          if (dx * dx + dy * dy > 100) d.push([x0 = x1, y0 = y1]);
          else d[d.length - 1] = [x1, y1];
          active.attr('d', dragline);
          active.attr("stroke", "black");
        });

        d3.event.on('end', function() {
          var hits = [];
          scope.data.forEach(function(d) {
            var point = [d.x, d.y];
            if (pointInPolygon(point, coords)) {
              hits.push(d);
            }
          });
          scope.selectEllipse(
            hits,
            coords
          );
        });
      }

      scope.$watchCollection('selectedGroups', function(selectedGroups) {
        if (!selectedGroups) {
            return;
        }

        var dragline = d3.line()
          .curve(d3.curveBasis);
        lassos.selectAll('path.line').remove();
        var lines = lassos.selectAll('path')
          .data(selectedGroups, d => d.idx);

        lines.enter().append('path')
          .datum(d => d.coords)
          .attr('class', 'line')
          .attr('stroke', "black")
          .attr('d', dragline);
        lines.exit().remove();

        /*
        var ellipses = lassos.selectAll('ellipse')
          .data(selectedGroups, d => d.idx);

        ellipses.enter()
          .append('ellipse')
          .attr('cx', d => d.center.x)
          .attr('cy', d => d.center.y)
          .attr('rx', d => d.axes.a)
          .attr('ry', d => d.axes.b)
          .attr('fill', 'none')
          .attr('stroke', 'red')
          .attr('stroke-width', 4)
          .attr('transform', d => {
            return 'rotate(' + d.angle * 180 / Math.PI + ',' + d.center.x + ',' + d.center.y + ')';
          });
        ellipses.exit().remove();
        */
      });

      canvas.on('mousemove', function() {
        moveMouse(d3.mouse(this));
      });
    }
  }
}]);
