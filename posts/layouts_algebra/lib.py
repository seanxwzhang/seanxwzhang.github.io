import numpy as np

from enum import Enum
from math import prod
from typing import Union, overload


class ZeroDepthMixin:
    def depth(self):
        return 0
    
class IntMixin:
    def is_integral(self):
        return True

class DynamicInt(int, ZeroDepthMixin, IntMixin):
    def __repr__(self):
        return f"{super().__repr__()}"
    

class StaticInt(int, ZeroDepthMixin, IntMixin):
    
    def __repr__(self):
        return f"Int<{super().__repr__()}>"
    
class SpecialLayouts(Enum):
    LayoutLeft = 'LayoutLeft'
    LayoutRight = 'LayoutRight'
    
class Underscore(ZeroDepthMixin):
    def __repr__(self):
        return "_"
    
_ = Underscore()

class Tuple(tuple):
    def __new__(cls, *elements):
        return super().__new__(cls, [DynamicInt(e) if isinstance(e, int) else Tuple(*e) if isinstance(e, (tuple, list)) else e for e in elements])
    
    def rank(self):
        return len(self)
    
    def depth(self):
        return 1 + max(e.depth() for e in self)
    
    def is_integral(self) -> bool:
        return self.depth() == 1 and self.rank() == 1
    
    def __getitem__(self, key: Union[int, slice]) -> Union[int, 'Tuple']:
        if isinstance(key, int):
            return super().__getitem__(key)
        else:
            return Tuple(*super().__getitem__(key))
    
    def size(self):
        return sum(e.size() if isinstance(e, Tuple) else 1 for e in self)
    
    def flatten(self, tup: 'Tuple' = None) -> 'Tuple':
        flat = []
        for e in self:
            if isinstance(e, Tuple):
                flat.extend(e.flatten())
            else:
                flat.append(e)
        return Tuple(*flat)
    
    def unflatten(self, tup: 'Tuple') -> 'Tuple':
        assert tup.size() == self.size(), f"Mismatch in size, cannot unflatten {tup} into {self}"
        assert self.depth() == 1, "Depth must be 1 to unflatten"
        unflat, idx = [], 0
        for t in tup:
            if isinstance(t, Tuple):
                unflat.append(self[idx:idx+t.size()].unflatten(t))
                idx += t.size()
            else:
                unflat.append(self[idx])
                idx += 1
        return Tuple(*unflat)

    def slice(self, crd: 'Tuple') -> 'Tuple':
        sliced = []
        for t, c in zip(self, crd):
            if isinstance(t, Tuple) and isinstance(c, Tuple) and tree_any(lambda e: isinstance(e, Underscore), c):
                sliced.append(t.slice(c))
            elif isinstance(c, Underscore):
                sliced.append(t)
        return Tuple(*sliced)
    
    def abs(self) -> 'Tuple':
        return Tuple(*[abs(e) if isinstance(e, int) else e.abs() for e in self])
    
    def __repr__(self):
        return f"({', '.join(e.__repr__() for e in self)})" if not self.is_integral() else f"{self[0]}"

Stride = Tuple
Shape = Tuple
Coord = Tuple
T = Tuple
Int = StaticInt
LayoutLeft = SpecialLayouts.LayoutLeft
LayoutRight = SpecialLayouts.LayoutRight

def tree_map(f, t: Tuple) -> Tuple:
    return Tuple(*[f(e) if not isinstance(e, Tuple) else tree_map(f, e) for e in t])

def tree_any(f, t: Tuple) -> bool:
    return any(f(e) if not isinstance(e, Tuple) else tree_any(f, e) for e in t)

def tree_all(f, t: Tuple) -> bool:
    return all(f(e) if not isinstance(e, Tuple) else tree_all(f, e) for e in t)

class Layout:
    @overload
    def __init__(self, shape: Shape) -> 'Layout':
        ...
    @overload
    def __init__(self, shape: Shape, stride: Union[Stride, SpecialLayouts]) -> 'Layout':
        ...
    @overload
    def __init__(self, *layouts: 'Layout') -> 'Layout':
        ...

    def __init__(self, *ts: Union[Shape, Stride, SpecialLayouts, 'Layout', StaticInt, DynamicInt]) -> 'Layout':
        if len(ts) == 1:
            Layout.__init__(self, ts[0], LayoutLeft)
        else:
            if len(ts) == 2 and isinstance(ts[0], Shape):
                assert isinstance(ts[1], (Stride, SpecialLayouts)), "Second argument must be a stride or a special layout"
                shape = ts[0]
                if ts[1] == LayoutLeft:
                    stride = Stride(Int(1), *np.cumprod(shape)[:-1])
                elif ts[1] == LayoutRight:
                    stride = Stride(*np.cumprod(shape[::-1])[1::-1], Int(1))
                else:
                    stride = ts[1]
            elif len(ts) == 2 and isinstance(ts[0], (StaticInt, DynamicInt)) and isinstance(ts[1], (StaticInt, DynamicInt)):
                shape = Shape(ts[0])
                stride = Stride(ts[1])
            else:
                assert all(isinstance(layout, Layout) for layout in ts), "All arguments must be layouts"
                shape = Shape([s for layout in ts for s in layout.shape])
                stride = Stride([s for layout in ts for s in layout.stride])
            assert shape.depth() == stride.depth() and shape.rank() == stride.rank(), "Shape and stride must have the same depth and rank"
            self.shape = shape
            self.stride = stride

    def __repr__(self):
        return f"({self.shape}):({self.stride})"
    
    def rank(self):
        return self.shape.rank()
    
    def depth(self):
        return self.shape.depth()
    
    def size(self):
        return prod(self.shape.flatten())
    
    def cosize(self):
        return max([s * d for s, d in zip(self.shape.flatten(), self.stride.flatten())])
    
    def flatten(self):
        return Layout(self.shape.flatten(), self.stride.flatten())
    
    def __len__(self):
        return self.rank()
    
    def idx2crd(self, idx: int) -> Coord:
        coords, shapes = [], self.shape.flatten()
        for i in range(shapes.rank()):
            coords.append(idx % shapes[i])
            idx //= shapes[i]
        return Tuple(*coords).unflatten(self.shape)

    def crd2idx(self, crd: Coord) -> int:
        assert isinstance(crd, Coord), "Coordinate must be a tuple"
        if crd.rank() == self.rank() and crd.depth() == self.depth():
            return sum(c * s for c, s in zip(crd.flatten(), self.stride.flatten()))
        idx = 0
        for i in range(crd.rank()):
            if isinstance(crd[i], tuple):
                idx += Layout(self.shape[i], self.stride[i])(*crd[i])
            else:
                idx += Layout(self.shape[i], self.stride[i])[crd[i]]
        return idx
    
    def slice(self, crd: Coord) -> 'Layout':
        return Layout(self.shape.slice(crd), self.stride.slice(crd))
    
    def compose(self, other: 'Layout') -> 'Layout':
        rshape, rstride = other.shape, other.stride
        if not rshape.is_integral():
            return Layout(*[self.compose(Layout(s, d)) for s, d in zip(rshape, rstride)])
        elif rstride.is_integral() and rstride[0] == 0:
            return other
        elif self.stride.is_integral():
            return Layout(rshape, Stride(rstride[0] * self.stride[0]))
        else:
            pass

    def __call__(self, *idx: Union[int, tuple, Underscore]):
        crd = Coord(*idx) if not (len(idx) == 1 and isinstance(idx[0], tuple)) else Coord(*idx[0])
        if tree_any(lambda e: isinstance(e, Underscore), crd):
            return self.slice(crd)
        else:
            return self.crd2idx(crd)

    def __getitem__(self, idx: int) -> int:
        return self.crd2idx(self.idx2crd(idx))
    




if __name__ == "__main__":
    l = Layout(T(3, T(2, 3)), T(1, T(3, 2)))
    print(f"{l =}")
    print(f"{l[2] =}")
    print(f"{l(1,1) =}")
    print(f"{l(1,(1,2)) =}")
    print(f"{l(_, 1) =}")
    print(f"{l(_, (1,2)) =}")
    print(f"{l(_, _) =}")
    print(f"{l(_, (_, 1)) =}")
    print(f"{l.size() =}")
    print(f"{l.cosize() =}")
    
    







