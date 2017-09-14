'use strict';

function colores_google(n) {
  var colores_g = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
  return colores_g[n % colores_g.length];
}

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
      templateUrl: 'static/partials/sort.html',
      controller: 'sortController'
    })
    $routeProvider.otherwise({redirectTo: '/'});
  }
]);

angular.module('controllers', [])

.controller('sortController', [
  '$scope',
  '$http',
  '$q',
  function($scope, $http, $q) {
    var quadtree;
    var getSpikesData;

    $scope.datasetChoices = []      // Datasets available for visualization (can switch between them)
    $scope.selectedDatasetIdx = 0;
    $scope.scatterData = [];        // List of points to visualize in scatter plot
    $scope.waveformsLoaded = false;
    $scope.limits = {
      xmax: 10,
      xmin: -10,
      ymax: 10,
      ymin: -10
    };

    $scope.k = 1;
    $scope.availableK = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];

    $scope.setK = function(k) {
        $scope.k = k;
    }

    var waveformData = [];

    var getScatterData = function() {
      $scope.waveformsLoaded = false;
      $scope.groups = [];
      getSpikesData = $http.get(
            'datasets/spikes/' + $scope.k
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
        $http.get('datasets/waveforms')
      ]).then(function(results) {
        waveformData = results[1].data;
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
          ymin: mean - 8 * std,
          ymax: mean + 8 * std
        };
        $scope.waveformsLoaded = true;
      });

    };

    getScatterData();

    $scope.groups = [];
    $scope.currentlySelected = [];
    $scope.selectCircle = function(x, y, r) {
      $scope.currentlySelected.splice(0, $scope.currentlySelected.length);
      quadtree.visit(nearest({x: x, y: y}, r, $scope.currentlySelected));
      $scope.$apply()
    }

    $scope.$watch('k', function(k) {
      if (!!$scope.waveformsLoaded) {
          getSpikesData = $http.get(
                'datasets/spikes/' + $scope.k
            ).then(function(data) {
              $scope.scatterData.forEach(function(d, i) {
                d.waveform = waveformData[i].waveform;
                d.cluster = data.data[i].cluster;
                quadtree.remove(d);
                quadtree.add(d);
              });
              $scope.scatterData = data.data;

              // update scope clusters available
            });
      }
    });

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
  }
])

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

      var line = d3.line()
        .x((d, i) => scales.x(i))
        .y(d => scales.y(d))
        .curve(d3.curveBasis);

      var plotGroup = svg.append('g');

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
            context.moveTo(scales.x(0), scales.y(waveform[0]));
            waveform.forEach((datapoint, i) => {
              if (i > 0) {
                context.lineTo(scales.x(i), scales.y(waveform[i]));
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
          .attr('size', 1.0)
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

        var RADIUS = 20;

        radiusCircle
          .attr('cx', scales.x(mouse.x))
          .attr('cy', scales.y(mouse.y))
          .attr('rx', RADIUS)
          .attr('ry', RADIUS);

        const r = scales.x.invert(RADIUS) - scales.x.domain()[0];
        scope.selectCircle(mouse.x, mouse.y, r);
      }

      canvas.on('mousemove', function() {
        moveMouse(d3.mouse(this));
      });
    }
  }
}]);
