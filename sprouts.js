// Sprouts game board.
// François Pinard, 2013-06.

var debug = false;
var initial_count = 3;

function log(text) {
  if (debug) console.log(text);
}

// Angular
// -------

// A function called in Paper may not force changes into Angular and
// itself be called by Angular, as a recursive $apply is forbidden.
// Simplest is to keep copying and $digest functions well separate.

function Controller($scope) {
  $scope.new_game = new_game;
  $scope.angular_copy = function() {
    $scope.initial_count = initial_count;
    $scope.line_layer = line_layer;
    $scope.paper = paper;
    $scope.sprout_layer = sprout_layer;
  }
}

function angular_copy() {
  var scope = angular.element('body').scope();
  scope.angular_copy();
}

function angular_digest() {
  var scope = angular.element('body').scope();
  scope.$digest();
}

// Lines
// --------

var current_line = null;
var starting_sprout;

function line_links(line, sprout1, sprout2) {
  sprout1.data.links.push(new Link(sprout2, line, true));
  sprout2.data.links.push(new Link(sprout1, line, false));
  if (sprout1.data.links.length > 2) {
    sprout1.fillColor = dead_inside;
    sprout1.strokeColor = dead_outside;
  };
  if (sprout2.data.links.length > 2) {
    sprout2.fillColor = dead_inside;
    sprout2.strokeColor = dead_outside;
  }
}

function line_move(line, sprout1, delta1, sprout2, delta2) {
  var segments = line.segments;
  var m1 = segments.length - 1;
  var delta = delta1;
  var epsilon = delta2.subtract(delta1).divide(m1);
  segments.forEach(function(segment) {
    segment.point = segment.point.add(delta);
    delta = delta.add(epsilon);
  });
  line.smooth();
  var location1 = sprout1.getNearestLocation(segments[1].point);
  segments[0].point = location1.point;
  segments[0].handleOut.angle = sprout1.getNormalAt(location1.offset).angle;
  var location2 = sprout2.getNearestLocation(segments[m1 - 1].point);
  segments[m1].point = location2.point;
  segments[m1].handleIn.angle = sprout1.getNormalAt(location2.offset).angle;
}

// Events
// ------

function onMouseDown(event) {
  if (selected_sprout != null) {
    dragged_sprout = selected_sprout;
    return;
  }
  starting_sprout = nearest_sprout(event.point);
  if (starting_sprout == null) return;
  var point = starting_sprout.getNearestLocation(event.point).point;
  current_line = new paper.Path({
    segments: [point],
    strokeColor: 'brown',
    strokeWidth: 3
  });
  if (debug) current_line.strokeWidth = 1;
}

function onMouseDrag(event) {
  if (dragged_sprout != null) {
    sprout_move(dragged_sprout, event.point);
    return;
  }
  if (current_line == null) return;
  current_line.add(event.point);
  if (layer_touched(line_layer, current_line)) {
    current_line.remove();
    current_line = null;
  }
}

function onMouseUp(event) {
  if (dragged_sprout != null) {
    dragged_sprout = null;
    return;
  }
  if (current_line == null) return;
  if (current_line.segments.length < 3) {
    // Prevent sprouts overlapping.
    current_line.remove();
    current_line = null;
    return;
  }
  var ending_sprout = nearest_sprout(event.point);
  if (ending_sprout == null) {
    current_line.remove();
    current_line = null;
    return;
  }
  if (ending_sprout == starting_sprout &&
      starting_sprout.data.links.length > 1) {
    // Prevent looping on a sprout with no room for two more links.
    current_line.remove();
    current_line = null;
    return;
  }
  var point = ending_sprout.getNearestLocation(event.point);
  current_line.add(point);
  if (layer_touched(line_layer, current_line)) {
    current_line.remove();
    current_line = null;
    return;
  }
  current_line.simplify(10);

  // Add a new sprout in the middle, and split the line in two.
  var sprout = sprout_new(
    current_line.getPointAt(current_line.length / 2));
  var line1 = current_line;
  current_line = line1.split(line1.length / 2 - radius);
  var line2 = current_line.split(2 * radius);
  current_line.remove();
  current_line = null;
  line_links(line1, starting_sprout, sprout);
  line_links(line2, sprout, ending_sprout);
  angular_copy();
  angular_digest();
}

// Layers
// ------

var sprout_layer;
var line_layer;

function layer_touched(layer, path) {
  for (var counter = 0; counter < layer.children.length; counter++) {
    var child = layer.children[counter]
    if (path != child && path.getIntersections(child).length > 0) return true;
  };
  return false;
}

// Links
// -----

function Link(sprout, line, starting) {
  this.sprout = sprout;
  this.line = line;
  this.starting = starting;
}

// Sprouts
// -------

var radius = 12;
var alive_inside = 'orange';
var alive_outside = 'red';
var alive_over = 'yellow';
var dead_inside = 'magenta';
var dead_outside = 'blue';
var dead_over = 'cyan';
var dragged_sprout = null;
var selected_sprout = null;

function nearest_sprout(point) {
  var ambiguous = true;
  var best_sprout = null;
  var best_distance;
  sprout_layer.children.forEach(function(sprout) {
    var distance = sprout.data.center.subtract(point).length
    if (distance < 100 && sprout.data.links.length < 3) {
      if (best_sprout == null || 2 * distance < best_distance) {
        ambiguous = false;
        best_sprout = sprout;
        best_distance = distance;
      } else if (distance < 2 * best_distance) {
        ambiguous = true;
      }
    }
  });
  if (ambiguous) return null;
  return best_sprout;
}

function new_game(count) {

  // Decide how many sprouts.
  if (count == null) {
    count = initial_count;
  } else {
    initial_count = count;
  };

  // Erase any previous game.
  line_layer.children.slice().forEach(function(line) {
    line.remove();
  });
  sprout_layer.children.slice().forEach(function(sprout) {
    sprout.remove();
  });

  // Add initial sprouts.
  var delta = 360 / count;
  var offset = new paper.Point();
  var grow = paper.view.size.divide(3);
  offset.length = 1
  offset.angle = Math.random() * delta;
  for (var counter = 0; counter < count; counter++) {
    sprout_new(paper.view.center.add(offset.multiply(grow)));
    offset.angle += delta;
  };

  // Show them all.
  paper.view.draw();
  angular_copy();
}

function sprout_move(sprout, center) {
  var delta = center.subtract(sprout.data.center);
  sprout.segments.forEach(function(segment) {
    segment.point = segment.point.add(delta);
  })
  dragged_sprout.data.center = center;
  sprout.data.links.forEach(function(link) {
    if (link.starting) {
      line_move(link.line,
                   sprout, delta, link.sprout, new paper.Point(0, 0));
    } else {
      line_move(link.line,
                   sprout, new paper.Point(0, 0), link.sprout, delta);
    }
  });
}

function sprout_new(center) {
  sprout_layer.activate()
  var sprout = new paper.Path.Circle({
    center: center,
    radius: radius,
    fillColor: alive_inside,
    strokeColor: alive_outside,
    strokeWidth: 4
  });
  sprout.data.center = center;
  sprout.data.links = []
  sprout.on('mouseenter', function() { sprout_select(sprout); });
  sprout.on('mouseleave', function() { sprout_unselect(sprout); });
  line_layer.activate();
  return sprout;
}

function sprout_select(sprout) {
  selected_sprout = sprout;
  if (sprout.data.links.length < 3) {
    sprout.fillColor = alive_over;
  } else {
    sprout.fillColor = dead_over;
  };
  if (debug) {
    sprout.data.links.forEach(function(link) {
      link.line.selected = true;
    })
  }
}

function sprout_unselect(sprout) {
  selected_sprout = null;
  if (sprout.data.links.length < 3) {
    sprout.fillColor = alive_inside;
  } else {
    sprout.fillColor = dead_inside;
  };
  if (debug) {
    sprout.data.links.forEach(function(link) {
      link.line.selected = false;
    })
  }
}

// Main program
// ------------

window.onload = function() {

  // Draw the initial display.
  paper.setup('sprouts');
  sprout_layer = new paper.Layer();
  line_layer = new paper.Layer();
  new_game();
  angular_digest();

  // Install mouse actions.
  var tool = new paper.Tool();
  tool.minDistance = 15;
  tool.onMouseDown = onMouseDown;
  tool.onMouseDrag = onMouseDrag;
  tool.onMouseUp = onMouseUp;
}
