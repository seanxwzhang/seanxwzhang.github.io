from lib import Layout, Coord, Underscore, _, Shape, Stride, Int, DynamicInt, StaticInt, Tuple, T, tree_any, tree_all
from abc import ABC, abstractmethod

try:
    from IPython.display import HTML, display
except ImportError:
    # Fallback for non-Jupyter environments
    def display(html):
        print("HTML content generated (IPython not available)")
    
    class HTML:
        def __init__(self, content):
            self.content = content


class Theme(ABC):
    """Abstract base class for layout themes"""
    
    @abstractmethod
    def get_cell_style(self, value: int, is_highlighted: bool, slice_indices: list[int] = None, custom_colors: list[str] = None) -> dict:
        """Return SVG style dict for a cell"""
        pass
    
    @abstractmethod
    def get_text_style(self, value: int, is_highlighted: bool, slice_indices: list[int] = None, custom_colors: list[str] = None) -> dict:
        """Return SVG style dict for text"""
        pass
    
    @property
    @abstractmethod
    def background_color(self) -> str:
        pass
    
    def get_slice_color(self, slice_index: int, custom_colors: list[str] = None) -> str:
        """Get color for a specific slice index
        
        Args:
            slice_index: The index of the slice
            custom_colors: List of custom colors (parallel to slices)
        """
        if custom_colors and slice_index < len(custom_colors) and custom_colors[slice_index]:
            return custom_colors[slice_index]
        
        # Default color palette
        colors = ['red', 'blue', 'green', 'orange', 'purple', 'brown', 'pink', 'gray']
        return colors[slice_index % len(colors)]


class PlainTheme(Theme):
    """Clean black-and-white theme for publication"""
    
    def get_cell_style(self, value: int, is_highlighted: bool, slice_indices: list[int] = None, custom_colors: list[str] = None) -> dict:
        if slice_indices and len(slice_indices) > 0:
            # Use the first slice's color if multiple slices match
            fill_color = self.get_slice_color(slice_indices[0], custom_colors)
        else:
            fill_color = 'white'
            
        return {
            'fill': fill_color,
            'stroke': 'black',
            'stroke-width': '1'
        }
    
    def get_text_style(self, value: int, is_highlighted: bool, slice_indices: list[int] = None, custom_colors: list[str] = None) -> dict:
        return {
            'fill': 'white' if is_highlighted else 'black',
            'font-family': 'Arial, sans-serif',
            'font-size': '14',
            'text-anchor': 'middle',
            'dominant-baseline': 'central'
        }
    
    @property
    def background_color(self) -> str:
        return 'white'


class SVGBuilder:
    """Helper class for building SVG elements"""
    
    def __init__(self, width: int, height: int, title: str = "", background_color: str = "white"):
        self.width = width
        self.height = height
        self.title = title
        self.background_color = background_color
        self.elements = []
    
    def add_rect(self, x: float, y: float, w: float, h: float, **styles) -> None:
        """Add rectangle element"""
        style_str = '; '.join(f"{k}: {v}" for k, v in styles.items())
        self.elements.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" style="{style_str}"/>'
        )
    
    def add_text(self, x: float, y: float, text: str, **styles) -> None:
        """Add text element"""
        style_str = '; '.join(f"{k}: {v}" for k, v in styles.items())
        self.elements.append(
            f'<text x="{x}" y="{y}" style="{style_str}">{text}</text>'
        )
    
    def build(self) -> str:
        """Generate complete SVG string"""
        svg_content = '\n            '.join(self.elements)
        return f'''<svg width="{self.width}" height="{self.height}" xmlns="http://www.w3.org/2000/svg">
            <title>{self.title}</title>
            <rect width="100%" height="100%" fill="{self.background_color}"/>
            {svg_content}
        </svg>'''
    

class LayoutPlotter:
    """SVG-based layout plotter for clean, publication-ready visualizations"""

    def __init__(self, layout: Layout, title: str = None, theme: Theme = None):
        self.layout = layout
        self.title = title or f"Layout {layout}"
        self.theme = theme or PlainTheme()
        self.slice_list = []  # List of slice coordinates for multiple highlighting
        self.slice_colors = []  # List of custom colors for each slice (optional)
        self.slice_coords = None  # Backward compatibility - will be deprecated

    def slice(self, coords: Coord, color: str = None) -> 'LayoutPlotter':
        """Add slice coordinates for highlighting (supports multiple slices)
        
        Args:
            coords: Coordinate pattern for the slice
            color: Optional custom color for this slice (e.g., 'red', '#FF0000')
        """
        self.slice_list.append(coords)
        self.slice_colors.append(color)  # None means use default color scheme
        self.slice_coords = coords  # Backward compatibility - keep last slice
        return self

    def slices(self, coords_list: list[Coord], colors: list[str] = None) -> 'LayoutPlotter':
        """Add multiple slice coordinates at once
        
        Args:
            coords_list: List of coordinate patterns for the slices
            colors: Optional list of custom colors for each slice
        """
        colors = colors or [None] * len(coords_list)
        for coords, color in zip(coords_list, colors):
            self.slice_list.append(coords)
            self.slice_colors.append(color)
        if coords_list:
            self.slice_coords = coords_list[-1]  # Backward compatibility
        return self

    def clear_slices(self) -> 'LayoutPlotter':
        """Clear all slice highlights"""
        self.slice_list.clear()
        self.slice_colors.clear()
        self.slice_coords = None
        return self

    def remove_slice(self, index: int) -> 'LayoutPlotter':
        """Remove a specific slice by index"""
        if 0 <= index < len(self.slice_list):
            self.slice_list.pop(index)
            self.slice_colors.pop(index)
            # Update backward compatibility field
            self.slice_coords = self.slice_list[-1] if self.slice_list else None
        return self

    def get_slice_count(self) -> int:
        """Get the number of active slices"""
        return len(self.slice_list)

    def get_slices(self) -> list[Coord]:
        """Get a copy of all slice coordinates"""
        return self.slice_list.copy()

    def get_slice_colors(self) -> list[str]:
        """Get a copy of all slice colors"""
        return self.slice_colors.copy()

    def set_slice_color(self, index: int, color: str) -> 'LayoutPlotter':
        """Set the color for a specific slice
        
        Args:
            index: Index of the slice to modify
            color: New color for the slice (e.g., 'red', '#FF0000')
        """
        if 0 <= index < len(self.slice_colors):
            self.slice_colors[index] = color
        return self

    def show(self, width: int = None, height: int = None) -> None:
        """Generate and display SVG"""
        svg_html = self.to_svg(width=width, height=height)
        display(HTML(svg_html))

    def show_mapping(self, width: int = None, height: int = None) -> None:
        """Show the mapping of the layout as a 2D grid, accompanied by a vertical bar on the left as the y-axis and a horizontal bar on the top as the x-axis. The y-axis is the domain and contains layout.size() number of cells. The x-axis is the range/cosize. The cells in the grid are all blank except for the ones where (y, x) is in the layout. The y-axis is highlighted if the y-coordinate is in the slice(domain of the slice). The x-axis is highlighted if the x-coordinate is in the slice (codmain of the slice, i.e., the actual sliced indices).
        """
        mapping_svg = self._render_mapping_svg(width, height)
        display(HTML(mapping_svg))
    
    def _render_mapping_svg(self, width: int = None, height: int = None) -> str:
        """Render the layout mapping visualization"""
        
        domain_size = self.layout.size()
        codomain_size = self.layout.cosize()
        
        # Calculate dimensions
        axis_bar_size = 25
        margin_left = 80  # Increased for rotated "domain" label
        margin_top = 60
        margin_right = 20
        margin_bottom = 20
        
        cell_size = min(600 // max(domain_size, codomain_size), 20)  # Adaptive cell size
        
        if width is None:
            width = codomain_size * cell_size + margin_left + margin_right
        if height is None:
            height = domain_size * cell_size + margin_top + margin_bottom + axis_bar_size
        
        svg = SVGBuilder(width, height, self.title, self.theme.background_color)
        
        # Add title
        svg.add_text(width/2, 20, self.title, **{
            'font-size': '16', 
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            'fill': 'black'
        })
        
        # Codomain axis (top horizontal bar) - shows the output indices 0 to cosize-1
        codomain_y = margin_top
        svg.add_text(margin_left + (codomain_size * cell_size)/2, margin_top - 10, "codomain", **{
            'font-size': '12',
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            'fill': 'black'
        })
        
        # Get the actual mappings from domain to codomain
        layout_outputs = set()
        domain_slice_indices = set()
        codomain_slice_indices = set()
        
        # Generate all layout mappings: domain_idx -> layout[domain_idx]
        for domain_idx in range(domain_size):
            coord = self.layout.idx2crd(domain_idx)
            output_idx = self.layout.crd2idx(coord)
            layout_outputs.add(output_idx)
            
            # Check if this domain coordinate is in the slice
            if self._is_slice_highlighted(coord):
                domain_slice_indices.add(domain_idx)
                codomain_slice_indices.add(output_idx)
        
        # Render codomain axis (horizontal bar at top)
        for codomain_idx in range(codomain_size):
            x = margin_left + codomain_idx * cell_size
            
            is_highlighted = codomain_idx in codomain_slice_indices
            is_used = codomain_idx in layout_outputs
            
            # Codomain axis cell colors
            if is_highlighted:
                fill_color = 'orange'  # Highlighted slice outputs
            elif is_used:
                fill_color = 'lightgreen'  # Used by layout
            else:
                fill_color = 'lightgray'  # Unused codomain indices
                
            axis_style = {
                'fill': fill_color,
                'stroke': 'black',
                'stroke-width': '1'
            }
            svg.add_rect(x, codomain_y, cell_size, axis_bar_size, **axis_style)
            
            # Codomain axis label
            if cell_size >= 15:  # Only show labels if cells are large enough
                svg.add_text(x + cell_size/2, codomain_y + axis_bar_size/2, str(codomain_idx), **{
                    'font-size': '10',
                    'text-anchor': 'middle',
                    'font-family': 'Arial, sans-serif',
                    'fill': 'black'
                })
        
        # Domain axis (left vertical bar) - shows the input indices
        domain_x = margin_left - axis_bar_size
        domain_label_y = margin_top + axis_bar_size + (domain_size * cell_size)/2
        svg.add_text(25, domain_label_y, "domain", **{
            'font-size': '12',
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            'fill': 'black',
            'transform': f'rotate(-90, 25, {domain_label_y})'
        })
        
        # Render domain axis (vertical bar on left)
        for domain_idx in range(domain_size):
            y = margin_top + axis_bar_size + domain_idx * cell_size
            
            is_highlighted = domain_idx in domain_slice_indices
            
            # Domain axis cell
            axis_style = {
                'fill': 'lightblue' if is_highlighted else 'lightgray',
                'stroke': 'black',
                'stroke-width': '1'
            }
            svg.add_rect(domain_x, y, axis_bar_size, cell_size, **axis_style)
            
            # Domain axis label (rotated 90 degrees)
            if cell_size >= 15:  # Only show labels if cells are large enough
                svg.add_text(domain_x + axis_bar_size/2, y + cell_size/2, str(domain_idx), **{
                    'font-size': '10',
                    'text-anchor': 'middle',
                    'font-family': 'Arial, sans-serif',
                    'fill': 'black',
                    'transform': f'rotate(-90, {domain_x + axis_bar_size/2}, {y + cell_size/2})'
                })
        
        # Render mapping grid
        grid_start_x = margin_left
        grid_start_y = margin_top + axis_bar_size
        
        # Create the mapping grid - mostly empty with dots where mappings exist
        for domain_idx in range(domain_size):
            coord = self.layout.idx2crd(domain_idx)
            output_idx = self.layout.crd2idx(coord)
            is_highlighted = self._is_slice_highlighted(coord)
            
            if output_idx < codomain_size:  # Make sure we're within bounds
                x = grid_start_x + output_idx * cell_size
                y = grid_start_y + domain_idx * cell_size
                
                # Draw a filled circle to represent the mapping
                circle_style = {
                    'fill': 'red' if is_highlighted else 'black',
                    'stroke': 'none'
                }
                
                # Add circle using SVG circle element
                radius = min(cell_size * 0.3, 5)
                svg.elements.append(
                    f'<circle cx="{x + cell_size/2}" cy="{y + cell_size/2}" r="{radius}" style="fill: {circle_style["fill"]}"/>'
                )
                
                # Add the domain->codomain mapping as text if cell is large enough
                if cell_size >= 20:
                    svg.add_text(x + cell_size/2, y + cell_size/2 + radius + 8, 
                                f"{domain_idx}→{output_idx}", **{
                        'font-size': '8',
                        'text-anchor': 'middle',
                        'font-family': 'Arial, sans-serif',
                        'fill': 'red' if is_highlighted else 'black'
                    })
        
        # Add grid lines for better visualization
        for i in range(domain_size + 1):
            y = grid_start_y + i * cell_size
            svg.elements.append(
                f'<line x1="{grid_start_x}" y1="{y}" x2="{grid_start_x + codomain_size * cell_size}" y2="{y}" style="stroke: lightgray; stroke-width: 0.5"/>'
            )
        
        for j in range(codomain_size + 1):
            x = grid_start_x + j * cell_size
            svg.elements.append(
                f'<line x1="{x}" y1="{grid_start_y}" x2="{x}" y2="{grid_start_y + domain_size * cell_size}" style="stroke: lightgray; stroke-width: 0.5"/>'
            )
        
        return svg.build()

    def to_svg(self, width: int = None, height: int = None) -> str:
        """Generate SVG string"""
        if self.layout.rank() == 1:
            return self._render_1d_svg(width, height)
        elif self.layout.rank() == 2:
            return self._render_2d_svg(width, height)
        else:
            raise ValueError(f"Unsupported layout rank: {self.layout.rank()}")

    def _is_slice_highlighted(self, coord: Coord) -> bool:
        """Check if a coordinate should be highlighted based on any slice (backward compatibility)"""
        return len(self._get_matching_slices(coord)) > 0
    
    def _get_matching_slices(self, coord: Coord) -> list[int]:
        """Get list of slice indices that match the given coordinate"""
        matching_slices = []
        
        for slice_idx, slice_coords in enumerate(self.slice_list):
            if self._coord_matches_slice(coord, slice_coords):
                matching_slices.append(slice_idx)
        
        return matching_slices
    
    def _coord_matches_slice(self, coord: Coord, slice_coords: Coord) -> bool:
        """Check if a coordinate matches a specific slice pattern"""
        # Check if coordinate matches the slice pattern
        slice_coord = slice_coords.flatten() if hasattr(slice_coords, 'flatten') else slice_coords
        coord_flat = coord.flatten() if hasattr(coord, 'flatten') else coord
        
        # Ensure we have the same number of dimensions to compare
        if len(slice_coord) != len(coord_flat):
            return False
        
        for c, s in zip(coord_flat, slice_coord):
            if not isinstance(s, Underscore) and c != s:
                return False
        return True

    def _render_1d_svg(self, width: int = None, height: int = None) -> str:
        """Render 1D layout as horizontal bar with domain axis"""
        
        # Calculate layout properties
        shape = self.layout.shape.flatten()
        n_cells = shape[0]
        
        # Default dimensions - more space for axis labels and domain bar
        width = width or (50 * n_cells + 80)  # 50px per cell + more margins
        height = height or 160  # More space for domain bar and labels
        
        # Calculate dimensions
        domain_bar_height = 30
        layout_bar_height = 40
        margin_left = 40
        margin_top = 30
        spacing = 20
        
        cell_width = (width - 2 * margin_left) / n_cells
        
        svg = SVGBuilder(width, height, self.title, self.theme.background_color)
        
        # Add title
        svg.add_text(width/2, 20, self.title, **{
            'font-size': '16', 
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            'fill': 'black'
        })
        
        # Domain bar (representing the coordinate space)
        domain_y = margin_top + 20
        svg.add_text(10, domain_y + domain_bar_height/2, "mode 0", **{
            'font-size': '12',
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            'fill': 'black'
        })
        
        for i in range(n_cells):
            coord = Coord(i)
            is_highlighted = self._is_slice_highlighted(coord)
            
            x = margin_left + i * cell_width
            
            # Domain cell
            domain_style = {
                'fill': 'lightblue' if is_highlighted else 'lightgray',
                'stroke': 'black',
                'stroke-width': '1'
            }
            svg.add_rect(x, domain_y, cell_width, domain_bar_height, **domain_style)
            
            # Domain cell label
            svg.add_text(x + cell_width/2, domain_y + domain_bar_height/2, str(i), **{
                'font-size': '12',
                'text-anchor': 'middle',
                'font-family': 'Arial, sans-serif',
                'fill': 'black'
            })
        
        # Layout values bar
        layout_y = domain_y + domain_bar_height + spacing
        for i in range(n_cells):
            coord = Coord(i)
            value = self.layout.crd2idx(coord)
            slice_indices = self._get_matching_slices(coord)
            is_highlighted = len(slice_indices) > 0
            
            x = margin_left + i * cell_width
            
            # Layout cell
            cell_style = self.theme.get_cell_style(value, is_highlighted, slice_indices, self.slice_colors)
            svg.add_rect(x, layout_y, cell_width, layout_bar_height, **cell_style)
            
            # Layout cell text
            text_style = self.theme.get_text_style(value, is_highlighted, slice_indices, self.slice_colors)
            svg.add_text(x + cell_width/2, layout_y + layout_bar_height/2, str(value), **text_style)
        
        return svg.build()

    def _render_2d_svg(self, width: int = None, height: int = None) -> str:
        """Render 2D layout as clean grid with mode axes"""
        
        shape = self.layout.shape.flatten()
        rows, cols = shape[0], shape[1]
        
        # Calculate dimensions with space for axis bars and labels
        axis_bar_size = 30
        margin_left = 80  # Increased for rotated "mode 0" label
        margin_top = 60
        margin_right = 20
        margin_bottom = 20
        
        if width is None:
            width = 40 * cols + margin_left + margin_right + axis_bar_size
        if height is None:
            height = 40 * rows + margin_top + margin_bottom + axis_bar_size
        
        cell_width = (width - margin_left - margin_right - axis_bar_size) / cols
        cell_height = (height - margin_top - margin_bottom - axis_bar_size) / rows
        
        svg = SVGBuilder(width, height, self.title, self.theme.background_color)
        
        # Add title
        svg.add_text(width/2, 20, self.title, **{
            'font-size': '16', 
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            'fill': 'black'
        })
        
        # Mode 1 axis (top horizontal bar) 
        mode1_y = margin_top
        svg.add_text(margin_left + (cols * cell_width)/2, margin_top - 10, "mode 1", **{
            'font-size': '12',
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            'fill': 'black'
        })
        
        for j in range(cols):
            coord_slice = Coord(_, j) if self.slice_coords else None
            is_highlighted = coord_slice and self._is_slice_highlighted(coord_slice)
            
            x = margin_left + j * cell_width
            
            # Mode 1 axis cell
            axis_style = {
                'fill': 'lightgreen' if is_highlighted else 'lightgray',
                'stroke': 'black',
                'stroke-width': '1'
            }
            svg.add_rect(x, mode1_y, cell_width, axis_bar_size, **axis_style)
            
            # Mode 1 axis label
            svg.add_text(x + cell_width/2, mode1_y + axis_bar_size/2, str(j), **{
                'font-size': '12',
                'text-anchor': 'middle',
                'font-family': 'Arial, sans-serif',
                'fill': 'black'
            })
        
        # Mode 0 axis (left vertical bar)
        mode0_x = margin_left - axis_bar_size
        mode0_label_y = margin_top + axis_bar_size + (rows * cell_height)/2
        svg.add_text(25, mode0_label_y, "mode 0", **{
            'font-size': '12',
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            'fill': 'black',
            'transform': f'rotate(-90, 25, {mode0_label_y})'
        })
        
        for i in range(rows):
            coord_slice = Coord(i, _) if self.slice_coords else None
            is_highlighted = coord_slice and self._is_slice_highlighted(coord_slice)
            
            y = margin_top + axis_bar_size + i * cell_height
            
            # Mode 0 axis cell
            axis_style = {
                'fill': 'lightblue' if is_highlighted else 'lightgray',
                'stroke': 'black',
                'stroke-width': '1'
            }
            svg.add_rect(mode0_x, y, axis_bar_size, cell_height, **axis_style)
            
            # Mode 0 axis label (rotated 90 degrees)
            svg.add_text(mode0_x + axis_bar_size/2, y + cell_height/2, str(i), **{
                'font-size': '12',
                'text-anchor': 'middle',
                'font-family': 'Arial, sans-serif',
                'fill': 'black',
                'transform': f'rotate(-90, {mode0_x + axis_bar_size/2}, {y + cell_height/2})'
            })
        
        # Render main grid
        grid_start_x = margin_left
        grid_start_y = margin_top + axis_bar_size
        
        for i in range(rows):
            for j in range(cols):
                coord = Coord(i, j)
                value = self.layout.crd2idx(coord)
                slice_indices = self._get_matching_slices(coord)
                is_highlighted = len(slice_indices) > 0
                
                x = grid_start_x + j * cell_width
                y = grid_start_y + i * cell_height
                
                # Cell rectangle
                cell_style = self.theme.get_cell_style(value, is_highlighted, slice_indices, self.slice_colors)
                svg.add_rect(x, y, cell_width, cell_height, **cell_style)
                
                # Cell text
                text_style = self.theme.get_text_style(value, is_highlighted, slice_indices, self.slice_colors)
                svg.add_text(x + cell_width/2, y + cell_height/2, str(value), **text_style)
        
        return svg.build()