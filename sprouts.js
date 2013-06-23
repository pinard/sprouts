// Sprouts game board.
// François Pinard, 2013-06.

// Layers.
var background_layer = project.activeLayer;
new Path.Rectangle({
  center: view.center,
  size: view.size,
  fillColor: 'beige'
});
var drawing_layer = new Layer();
var sprout_layer = new Layer();

// Drawings.
tool.minDistance = 15;
var current_drawing = null;
var starting_sprout;

// Sprouts.
var radius = 12;
var alive_inside = 'orange';
var alive_outside = 'red';
var alive_over = 'yellow';
var dead_inside = 'magenta';
var dead_outside = 'blue';
var dead_over = 'cyan';
var dragged_sprout = null;
var selected_sprout = null;

add_initial_sprouts(3);

// Functions.

function add_initial_sprouts(count) {
  var delta = 360 / count;
  var offset = new Point();
  var size = view.size;
  offset.length = Math.min(size.width, size.height) * 1 / 3;
  offset.angle = Math.random() * delta;
  for (var counter = 0; counter < count; counter++) {
    new_sprout(view.center + offset);
    offset.angle += delta;
  }
}

function add_links(sprout1, sprout2, drawing) {
  sprout1.data.links.push([sprout2, drawing, true]);
  sprout2.data.links.push([sprout1, drawing, false]);
  if (sprout1.data.links.length > 2) {
    sprout1.fillColor = dead_inside;
    sprout1.strokeColor = dead_outside;
  };
  if (sprout2.data.links.length > 2) {
    sprout2.fillColor = dead_inside;
    sprout2.strokeColor = dead_outside;
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

function new_sprout(center) {
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
  sprout.on('mouseleave', function() { sprout_deselect(sprout); });
  drawing_layer.activate();
  return sprout;
}

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
  })
}

function onMouseDrag(event) {
  if (dragged_sprout != null) {
    move_sprout(dragged_sprout, event.point);
    return;
  }
  if (current_drawing == null) return;
  current_drawing.add(event.point);
  if (touches_any_drawing(current_drawing)) {
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
  if (touches_any_drawing(current_drawing)) {
    current_drawing.remove();
    current_drawing = null;
    return;
  }
  current_drawing.simplify(10);

  // Add a new sprout in the middle, and split the drawing in two.
  var sprout = new_sprout(
    current_drawing.getPointAt(current_drawing.length / 2));
  var drawing1 = current_drawing;
  current_drawing = drawing1.split(drawing1.length / 2 - radius);
  var drawing2 = current_drawing.split(2 * radius);
  current_drawing.remove();
  current_drawing = null;
  add_links(starting_sprout, sprout, drawing1);
  add_links(sprout, ending_sprout, drawing2);
}

function touches_any_drawing(path) {
  for (var counter = 0; counter < drawing_layer.children.length; counter++) {
    var drawing = drawing_layer.children[counter]
    if (path != drawing && path.getIntersections(drawing).length > 0) {
      return true;
    }
  };
  return false;
}

function move_drawing(drawing, sprout1, delta1, sprout2, delta2) {
  var segments = drawing.segments;
  var delta = delta1;
  var epsilon = (delta2 - delta1) / (segments.length - 1);
  segments.forEach(function(segment) {
    segment.point += delta;
    delta += epsilon;
  });
  drawing.smooth();
  drawing.simplify();
  segments[0].point = sprout1.getNearestLocation(
    segments[1].point).point;
  segments[segments.length - 1].point = sprout2.getNearestLocation(
    segments[segments.length - 2].point).point;
}

function move_sprout(sprout, center) {
  var delta = center - sprout.data.center;
  sprout.segments.forEach(function(segment) {
    segment.point += delta;
  })
  dragged_sprout.data.center = center;
  sprout.data.links.forEach(function(link) {
    var other = link[0];
    var drawing = link[1];
    var starting = link[2];
    if (starting) {
      move_drawing(drawing, sprout, delta, other, new Point(0, 0));
    } else {
      move_drawing(drawing, sprout, new Point(0, 0), other, delta);
    }
  });
}

function sprout_deselect(sprout) {
  selected_sprout = null;
  if (sprout.data.links.length < 3) {
    sprout.fillColor = alive_inside;
  } else {
    sprout.fillColor = dead_inside;
  }
}

function sprout_select(sprout) {
  selected_sprout = sprout;
  if (sprout.data.links.length < 3) {
    sprout.fillColor = alive_over;
  } else {
    sprout.fillColor = dead_over;
  }
}
