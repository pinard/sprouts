// Sprouts game board.
// François Pinard, 2013-06.

var debug = false;

if (debug) {
  function log(text) { console.log(text); }
} else {
  function log(text) { }
}

// Drawings
// --------

tool.minDistance = 15;
var current_drawing = null;
var starting_sprout;

function drawing_links(drawing, sprout1, sprout2) {
  sprout1.data.links.push(new Link(sprout2, drawing, true));
  sprout2.data.links.push(new Link(sprout1, drawing, false));
  if (sprout1.data.links.length > 2) {
    sprout1.fillColor = dead_inside;
    sprout1.strokeColor = dead_outside;
  };
  if (sprout2.data.links.length > 2) {
    sprout2.fillColor = dead_inside;
    sprout2.strokeColor = dead_outside;
  }
}

function drawing_move(drawing, sprout1, delta1, sprout2, delta2) {
  var segments = drawing.segments;
  var m1 = segments.length - 1;
  var delta = delta1;
  var epsilon = (delta2 - delta1) / m1;
  segments.forEach(function(segment) {
    segment.point += delta;
    delta += epsilon;
  });
  drawing.smooth();
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
  current_drawing = new Path({
    segments: [point],
    strokeColor: 'brown',
    strokeWidth: 3
  });
  if (debug) current_drawing.strokeWidth = 1;
}

function onMouseDrag(event) {
  if (dragged_sprout != null) {
    sprout_move(dragged_sprout, event.point);
    return;
  }
  if (current_drawing == null) return;
  current_drawing.add(event.point);
  if (layer_touched(drawing_layer, current_drawing)) {
    current_drawing.remove();
    current_drawing = null;
  }
}

function onMouseUp(event) {
  if (dragged_sprout != null) {
    dragged_sprout = null;
    return;
  }
  if (current_drawing == null) return;
  if (current_drawing.segments.length < 3) {
    // Prevent sprouts overlapping.
    current_drawing.remove();
    current_drawing = null;
    return;
  }
  var ending_sprout = nearest_sprout(event.point);
  if (ending_sprout == null) {
    current_drawing.remove();
    current_drawing = null;
    return;
  }
  if (ending_sprout == starting_sprout &&
      starting_sprout.data.links.length > 1) {
    // Prevent looping on a sprout with no room for two more links.
    current_drawing.remove();
    current_drawing = null;
    return;
  }
  var point = ending_sprout.getNearestLocation(event.point);
  current_drawing.add(point);
  if (layer_touched(drawing_layer, current_drawing)) {
    current_drawing.remove();
    current_drawing = null;
    return;
  }
  current_drawing.simplify(10);

  // Add a new sprout in the middle, and split the drawing in two.
  var sprout = sprout_new(
    current_drawing.getPointAt(current_drawing.length / 2));
  var drawing1 = current_drawing;
  current_drawing = drawing1.split(drawing1.length / 2 - radius);
  var drawing2 = current_drawing.split(2 * radius);
  current_drawing.remove();
  current_drawing = null;
  drawing_links(drawing1, starting_sprout, sprout);
  drawing_links(drawing2, sprout, ending_sprout);
}

// Layers
// ------

var background_layer = project.activeLayer;
var sprout_layer = new Layer();
var drawing_layer = new Layer();

function layer_touched(layer, path) {
  for (var counter = 0; counter < layer.children.length; counter++) {
    var child = layer.children[counter]
    if (path != child && path.getIntersections(child).length > 0) return true;
  };
  return false;
}

// Links
// -----

function Link(sprout, drawing, starting) {
  this.sprout = sprout;
  this.drawing = drawing;
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

function add_initial_sprouts(count) {
  var delta = 360 / count;
  var offset = new Point();
  var size = view.size;
  offset.length = Math.min(size.width, size.height) * 1 / 3;
  offset.angle = Math.random() * delta;
  for (var counter = 0; counter < count; counter++) {
    sprout_new(view.center + offset);
    offset.angle += delta;
  }
}

function nearest_sprout(point) {
  var ambiguous = true;
  var best = null;
  sprout_layer.children.forEach(function(sprout) {
    var distance = (sprout.data.center - point).length
    if (distance < 100) {
      if (sprout.data.links.length < 3) {
        if (best == null || 2 * distance < (best.data.center - point).length) {
          ambiguous = false;
          best = sprout;
        } else if (distance < 2 * (best.data.center - point).length) {
          ambiguous = true;
        }
      }
    }
  });
  if (ambiguous) return null;
  return best;
}

function sprout_move(sprout, center) {
  var delta = center - sprout.data.center;
  sprout.segments.forEach(function(segment) {
    segment.point += delta;
  })
  dragged_sprout.data.center = center;
  sprout.data.links.forEach(function(link) {
    if (link.starting) {
      drawing_move(link.drawing,
                   sprout, delta, link.sprout, new Point(0, 0));
    } else {
      drawing_move(link.drawing,
                   sprout, new Point(0, 0), link.sprout, delta);
    }
  });
}

function sprout_new(center) {
  sprout_layer.activate()
  var sprout = new Path.Circle({
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
  drawing_layer.activate();
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
      link.drawing.selected = true;
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
      link.drawing.selected = false;
    })
  }
}

// Main program
// ------------

background_layer.activate();
new Path.Rectangle({
  center: view.center,
  size: view.size,
  fillColor: 'beige'
});

add_initial_sprouts(3);
