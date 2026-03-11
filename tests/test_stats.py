import pytest
from analysis.stats import mean

def test_mean_basic():  
    assert mean([1, 2, 3, 4, 5]) == 3.0

def test_mean_one_element():
    assert mean([42]) == 42.0

def test_mean_negative():
    assert mean([-1, -2, -3, -4, -5]) == -3.0
