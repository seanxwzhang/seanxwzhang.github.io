#!/usr/bin/env python3
"""
Demonstration of configurable colors for multiple slices in LayoutPlotter
"""

from lib import Layout, Coord, T, _
from plotter import LayoutPlotter

def demo_configurable_colors():
    """Demonstrate different ways to configure slice colors"""
    
    # Create a 2D layout
    layout = Layout(T(4, 6), T(6, 1))  # Row-major layout
    
    print("=== Multiple Slice Color Configuration Demo ===\n")
    
    # Method 1: Chain slices with individual colors
    print("Method 1: Chain slices with custom colors")
    plotter1 = LayoutPlotter(layout, title="Method 1: Individual Colors")
    plotter1.slice(Coord(0, _), color="red") \
           .slice(Coord(_, 2), color="blue") \
           .slice(Coord(3, _), color="green")
    
    print(f"Slices: {plotter1.get_slices()}")
    print(f"Colors: {plotter1.get_slice_colors()}")
    print()
    
    # Method 2: Bulk addition with color list
    print("Method 2: Bulk slice addition with colors")
    plotter2 = LayoutPlotter(layout, title="Method 2: Bulk Colors")
    slice_coords = [Coord(1, _), Coord(_, 1), Coord(_, 4)]
    slice_colors = ["purple", "#FF6B35", "cyan"]
    plotter2.slices(slice_coords, colors=slice_colors)
    
    print(f"Slices: {plotter2.get_slices()}")
    print(f"Colors: {plotter2.get_slice_colors()}")
    print()
    
    # Method 3: Add slices first, then set colors
    print("Method 3: Add slices then modify colors")
    plotter3 = LayoutPlotter(layout, title="Method 3: Post-hoc Colors")
    plotter3.slice(Coord(0, _)) \
           .slice(Coord(1, _)) \
           .slice(Coord(2, _))
    
    print(f"Initial colors: {plotter3.get_slice_colors()}")
    
    # Modify specific slice colors
    plotter3.set_slice_color(0, "magenta") \
           .set_slice_color(1, "orange") \
           .set_slice_color(2, "lime")
    
    print(f"After modification: {plotter3.get_slice_colors()}")
    print()
    
    # Method 4: Mixed approach
    print("Method 4: Mixed approach")
    plotter4 = LayoutPlotter(layout, title="Method 4: Mixed")
    plotter4.slice(Coord(0, _), color="red")      # Custom color
    plotter4.slice(Coord(1, _))                   # Default color
    plotter4.slice(Coord(_, 3), color="yellow")   # Custom color
    
    print(f"Mixed colors: {plotter4.get_slice_colors()}")
    print("(None means use default color scheme)")
    print()
    
    # Demonstrate color resolution
    print("Color resolution demonstration:")
    theme = plotter4.theme
    for i, color in enumerate(plotter4.get_slice_colors()):
        resolved_color = theme.get_slice_color(i, plotter4.slice_colors)
        print(f"  Slice {i}: {color or 'None'} → {resolved_color}")
    
    print(f"\n=== Demo completed! ===")
    
    # Return a plotter for potential visualization
    return plotter1

if __name__ == "__main__":
    demo_plotter = demo_configurable_colors()
    
    print("\n" + "="*60)
    print("USAGE EXAMPLES:")
    print("="*60)
    print("""
# Basic usage with custom colors:
plotter = LayoutPlotter(layout, title="My Layout")

# Method 1: Individual slice with color
plotter.slice(Coord(0, _), color="red")
plotter.slice(Coord(_, 2), color="#FF6B35")

# Method 2: Bulk slices with colors
coords = [Coord(1, _), Coord(_, 1)]
colors = ["purple", "cyan"]
plotter.slices(coords, colors=colors)

# Method 3: Modify existing slice colors
plotter.set_slice_color(0, "lime")

# Method 4: Mixed - some with colors, some default
plotter.slice(Coord(2, _))  # Uses default color
plotter.slice(Coord(3, _), color="gold")  # Custom color

# Display the layout
plotter.show()
""")