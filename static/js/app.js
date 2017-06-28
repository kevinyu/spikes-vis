'use strict';

angular.module('App', [
  'ngRoute',
  'controllers',
  'charts'
])

.config([
  '$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/spikes', {
      templateUrl: 'static/partials/spikes.html',
      controller: 'spikesController'
    });
    $routeProvider.otherwise({redirectTo: '/spikes'});
  }
]);


angular.module('controllers', [])

.controller('spikesController', [
  '$scope',
  '$http',
  '$q',
  function($scope, $http, $q) {
    $scope.waveformsLoaded = false;
    $scope.groups = [];

    var quadtree = d3.quadtree()
      .extent([[-10, 10], [-10, 10]])
      .x(d => d.x)
      .y(d => d.y);

    function nearest(node, radius, hits) {
      return function(quad, x1, y1, x2, y2) {
        if (quad.data && (quad.data !== node)) {
          var x = node.x - quad.data.x;
          var y = node.y - quad.data.y;
          if (x * x + y * y < radius * radius) {
            hits.push(quad.data);
          }
        }
        return (
          x1 > node.x + radius ||
          x2 < node.x - radius ||
          y1 > node.y + radius ||
          y2 < node.y - radius
        );
      }
    }

    $scope.spikes = [];
    var getSpikesData = $http
      .get(config.DATASERVER + '/scatter')
      .then(function(data) {
        quadtree.addAll(data.data);
        $scope.spikes = data.data;
        return data;
      });

    $q.all([
      getSpikesData,
      $http.get(config.DATASERVER + '/data')
    ]).then(function(results) {
      var waveformData = results[1].data;
      // TODO: in the future should make sure that the id's line up properly
      $scope.spikes.forEach(function(d, i) {
        d.waveform = waveformData[i].waveform;
        quadtree.remove(d);
        quadtree.add(d);
      });
      $scope.waveformsLoaded = true;
    });

    $scope.currentlySelected = [];
    $scope.selectCircle = function(x, y, r) {
      $scope.currentlySelected.splice(0, $scope.currentlySelected.length);
      quadtree.visit(nearest({x: x, y: y}, r, $scope.currentlySelected));
      $scope.$apply()
    }

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

    // Select an entire ellipse and create a new plot of waveforms
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

    $scope.close = function(group) {
      const i = $scope.groups.indexOf(group);
      $scope.groups.splice(i, 1);
    }
  }
]);


angular.module('charts', [])

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
      closeable: '@'
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
          .domain([attrs.xmin, attrs.xmax])
          .range([0, width]),
        y: d3.scaleLinear()
          .domain([attrs.ymin, attrs.ymax])
          .range([height, 0])
      };

      var line = d3.line()
        .x((d, i) => scales.x(i))
        .y(d => scales.y(d))
        .curve(d3.curveLinear);

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
            .data(data, d => d.idx);
          lines.enter().append('path')
            .datum(d => d.waveform)
            .attr('class', 'line')
            .attr('d', line);
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

.directive('spikesScatter', ['$http', function($http) {
  return {
    restrict: 'E',
    templateUrl: 'static/partials/spikes_scatter.html',
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

      var fakeContainer = document.createElement('custom');
      var container = d3.select(fakeContainer);

      var scales = {
        x: d3.scaleLinear()
          .domain([attrs.xmin, attrs.xmax])
          .range([0, width]),
        y: d3.scaleLinear()
          .domain([attrs.ymin, attrs.ymax])
          .range([height, 0])
      }

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
        draw(scope.data);
      });

      function draw(data) {
        var circles = container.selectAll('c.circle')
          .data(data, d => d.idx);

        circles.enter()
          .append('c')
          .classed('circle', true)
          .attr('fillStyle', 'black')
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

      var dragline = d3.line()
        .curve(d3.curveBasis);

      canvas.call(d3.drag()
        .container(function() { return this; })
        .subject(function() {var p = [d3.event.x, d3.event.y]; return [p, p];})
        .on('start', dragstarted));

      function dragstarted() {
        if (!scope.data || (!!scope.data && !scope.data[0].waveform)) {
          return;
        }
        var d = d3.event.subject,
          active = svg.append('path').datum(d),
          x0 = d3.event.x,
          y0 = d3.event.y;

        d3.event.on('drag', function() {
          var x1 = d3.event.x;
          var y1 = d3.event.y;
          moveMouse([x1, y1]);
          var dx = x1 - x0;
          var dy = y1 - y0;

          if (dx * dx + dy * dy > 100) d.push([x0 = x1, y0 = y1]);
          else d[d.length - 1] = [x1, y1];
          active.attr('d', dragline);
        });

        d3.event.on('end', function() {
          var fit = fitEllipse(d);
          var center = ellipseCenter(fit);
          var angle = ellipseAngle(fit);
          var axes = ellipseAxes(fit);
          active.remove();

          scope.selectEllipse(
            scales.x.invert(center.x),
            scales.y.invert(center.y),
            scales.x.invert(axes.a) - scales.x.domain()[0],
            scales.y.invert(axes.b) - scales.y.domain()[0],
            angle,
            {
              center: center,
              axes: axes,
              angle: angle
            });
        });
      }

      scope.$watchCollection('selectedGroups', function(selectedGroups) {
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
      });

      canvas.on('mousemove', function() {
        moveMouse(d3.mouse(this));
      });
    }
  }
}]);
