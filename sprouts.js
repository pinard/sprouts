// Sprouts game board.
// François Pinard, 2013-06.

function log(text) { console.log(text); }
function log(text) { }

// Layers.
var curve_layer = project.activeLayer;
var sprout_layer = new Layer();

// Curves.
tool.minDistance = 15;
var drawing = null;

// Sprouts.
var radius = 12;
var starting_sprout;
add_initial_sprouts(50);
var equilibrium = 200;

// Functions.

function add_initial_sprouts(count) {
  var delta = 360 / count;
  var offset = new Point();
  var size = view.size;
  offset.length = Math.min(size.width, size.height) * 1 / 10;
  offset.angle = 0;
  //offset.angle = Math.random() * delta;
  for (var counter = 0; counter < count; counter++) {
    new_sprout(view.center + offset);
    offset.angle += delta;
  }
}

function add_links(sprout1, sprout2, curve) {
  sprout1.data.links.push([sprout2, curve, true]);
  sprout2.data.links.push([sprout1, curve, false]);
  if (sprout1.data.links.length > 2) {
    sprout1.fillColor = 'magenta';
    sprout1.strokeColor = 'blue';
  };
  if (sprout2.data.links.length > 2) {
    sprout2.fillColor = 'magenta';
    sprout2.strokeColor = 'blue';
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
    fillColor: 'orange',
    strokeColor: 'red',
    strokeWidth: 4
  });
  sprout.data.center = center;
  sprout.data.links = []
  sprout.on('mouseenter', function() {
    if (sprout.data.links.length < 3) {
      sprout.fillColor = 'yellow';
    }
  });
  sprout.on('mouseleave', function() {
    if (sprout.data.links.length < 3) {
      sprout.fillColor = 'orange';
    }
  });
  curve_layer.activate();
  return sprout;
}

var slowness = 1;
var frame_count = 0;

function onFrame(event) {
  if (drawing != null) return;

  if (frame_count == 1000) {
    drawing = new Path();
    return;
  };

  frame_count += 1;
  if (frame_count == 1000000) frame_count = 0;
  if (frame_count % slowness != 0) return;

  var sprouts = sprout_layer.children;

  // Compute view extent and barycenter of sprouts.
  var sum = new Point(0, 0);
  var extent = new Rectangle(0, 0, 0, 0);
  sprouts.forEach(function(sprout) {
    var center = sprout.data.center;
    sum += center;
    if (center.x < extent.left) extent.left = center.x;
    if (center.x > extent.right) extent.right = center.x;
    if (center.y < extent.top) extent.top = center.y;
    if (center.x > extent.bottom) extent.bottom = center.y;
  });
  var barycenter = sum / sprouts.length;

  // Change equilibrium to shrink or grow, as needed.
  if (frame_count % 30 == 0) {
    if (extent.size.x > view.size.x || extent.size.y > view.size.y) {
      equilibrium -= 1;
    } else {
      equilibrium += 1;
    };
    log('equilibrium = ' + equilibrium);
  };

  // Start with an overall translation.
  var vector = view.center - barycenter;
  sprouts.forEach(function(sprout) {
    sprout.data.delta = vector.clone();
    log('*over ' + sprout + ' center = ' + sprout.data.center
       + ' delta = ' + sprout.data.delta);
  });

  // Add interaction goals between sprouts.
  for (var counter2 = 1; counter2 < sprouts.length; counter2++) {
    var sprout2 = sprouts[counter2];
    for (var counter1 = 0; counter1 < counter2; counter1++) {
      var sprout1 = sprouts[counter1];
      vector = sprout2.data.center - sprout1.data.center;
      log('*vec avant = ' + vector + ' equil = ' + equilibrium
         + ' length = ' + vector.length);
      vector.length -= equilibrium;
      log('*vec après = ' + vector);
      log('*s1 avant ' + sprout1 + ' delta = ' + sprout1.data.delta);
      sprout1.data.delta += vector;
      log('*s1 après ' + sprout1 + ' delta = ' + sprout1.data.delta);
      log('*s2 avant ' + sprout2 + ' delta = ' + sprout2.data.delta);
      sprout2.data.delta -= vector;
      log('*s2 après ' + sprout2 + ' delta = ' + sprout2.data.delta);
    }
  };

  // Move sprouts.
  sprouts.forEach(function(sprout) {
    log('*move ' + sprout + ' delta = ' + sprout.data.delta);
    var delta = sprout.data.delta;
    if (Math.abs(delta.x) > Math.abs(delta.y) + 2) {
      delta /= Math.abs(delta.x);
    } else if (Math.abs(delta.y) > Math.abs(delta.x) + 2) {
      delta /= Math.abs(delta.y);
    } else {
      return;
    };
    translate_path(sprout, delta);
    sprout.data.center += delta;
  });

  //project.layers.forEach(function(layer) {
  //  layer.children.forEach(function(path) {
  //    translate_path(path, delta);
  //    if (layer == sprout_layer) path.data.center += delta;
  //  })
  //})
}

function onMouseDown(event) {
  starting_sprout = nearest_sprout(event.point);
  if (starting_sprout == null) return;
  var point = starting_sprout.getNearestLocation(event.point);
  drawing = new Path({
    segments: [point],
    strokeColor: 'brown',
    strokeWidth: 3
  })
}

function onMouseDrag(event) {
  if (drawing == null) return;
  drawing.add(event.point);
  if (drawing_touches_anything()) {
    drawing.remove();
    drawing = null;
  }
}

function onMouseUp(event) {
  if (drawing == null) return;
  if (drawing._segments.length < 3) {
    // Prevent sprouts overlapping.
    drawing.remove();
    drawing = null;
    return;
  }
  var ending_sprout = nearest_sprout(event.point);
  if (ending_sprout == null) {
    drawing.remove();
    drawing = null;
    return;
  }
  if (ending_sprout == starting_sprout &&
      starting_sprout.data.links.length > 1) {
    // Prevent looping on a sprout with no room for two more links.
    drawing.remove();
    drawing = null;
    return;
  }
  var point = ending_sprout.getNearestLocation(event.point);
  drawing.add(point);
  if (drawing_touches_anything()) {
    drawing.remove();
    drawing = null;
    return;
  }
  drawing.simplify(10);

  // Add a new sprout in the middle, and split the curve in two.
  var sprout = new_sprout(drawing.getPointAt(drawing.length / 2));
  var curve1 = drawing;
  drawing = curve1.split(curve1.length / 2 - radius);
  var curve2 = drawing.split(2 * radius);
  drawing.remove();
  drawing = null;
  add_links(starting_sprout, sprout, curve1);
  add_links(sprout, ending_sprout, curve2);
}

function drawing_touches_anything() {
  for (var counter = 0; counter < curve_layer.children.length; counter++) {
    var curve = curve_layer.children[counter]
    if (curve != drawing && drawing.getIntersections(curve).length > 0) {
      return true;
    }
  };
  return false;
}

function translate_path(path, delta) {
  path.segments.forEach(function(segment) {
    segment.point += delta;
  })
}
