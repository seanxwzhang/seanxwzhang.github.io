import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
from typing import Union, Iterable
from scipy.stats import norm
import plotly.graph_objects as go


def prior(x: Union[float, Iterable[float]], weights=[0.3, 0.2, 0.5], means=[-3, 0, 4], stddevs=[1, 1, 2]):
	"""the prior probability p(x), which is a mixture of Gaussian distributions
	"""
	# Calculate the mixture of Gaussian distributions
	p = np.zeros_like(x)
	for mean, stddev, weight in zip(means, stddevs, weights):
		p += weight * norm.pdf(x, mean, stddev)
	return p


def likelihood(y: Union[float, Iterable[float]], x: float, sigma=1.0):
	"""the likelihood function p(y|x), which is a single Gaussian distribution
	"""
	# Calculate the single Gaussian distribution
	return norm.pdf(y, x, sigma)


def joint(domain=[-12, 12], weights=[0.3, 0.2, 0.5], means=[-3, 0, 4], stddevs=[1, 1, 2], sigma=1.0):
	"""the joint probability p(x, y), which is the product of the prior and likelihood
	"""
	x = np.linspace(domain[0], domain[1], 1000)
	y = np.linspace(domain[0], domain[1], 1000)
	p1 = prior(x, weights, means, stddevs)
	z = np.zeros((len(x), len(y)))
	for i in range(len(x)):
		z[:, i] = p1[i] * likelihood(y, x[i], sigma)

	return x, y, z


# def posterior():
# 	"""the posterior probability p(x|y), which is the product of the prior and likelihood"""

# Plot the joint probability in 3D using plotly
def plot_joint(X, Y, Z, size=600, x=None, y=None):
	if x is not None:
		X = X[X <= x]
	if y is not None:
		Y = Y[Y <= y]
	# Create a 3D surface plot
	fig = go.Figure(data=[go.Surface(z=Z, x=X, y=Y)])
	fig.update_layout(
		title='Joint Probability Distribution',
		autosize=True,
		width=size, height=size,
		margin=dict(l=65, r=50, b=65, t=90),
		scene=dict(
			xaxis_title='X',
			yaxis_title='Y',
			zaxis_title='P(X, Y)'),
	)
	return fig


def plot_max():
	x = np.linspace(-12, 12, 1000)
	X, Y = np.meshgrid(x, x)
	# Z is element-wise max of X and Y
	Z = np.maximum(X, Y)
	fig = go.Figure(data=[go.Surface(z=Z, x=X, y=Y)])
	fig.update_layout(
		title='Max Function',
		autosize=True,
		width=600, height=600,
		margin=dict(l=65, r=50, b=65, t=90),
		scene=dict(
			xaxis_title='X',
			yaxis_title='Y',
			zaxis_title='max(X, Y)'),
	)
	return fig


# Use Streamlit to display a slide that controls the stddev of the likelihood function

# Use Streamlit to display the plot
st.set_page_config(layout="wide")
col0, col1 = st.columns([1, 1])

with col0:
	sigma = st.slider(
		'Standard Deviation of the Likelihood Function', 0.1, 5.0, 1.0, 0.1)
	fig0 = plot_joint(*joint(sigma=sigma), size=600)
	col0.write("The joint probability distribution of X and Y")
	col0.plotly_chart(fig0)

with col1:
	y = col1.slider('Y', -12.0, 12.0, 0.0, 0.1)
	col1.write("Conditional probability distribution of X given Y")
	fig1 = plot_joint(*joint(sigma=sigma), size=600, y=y)
	col1.plotly_chart(fig1)

st.plotly_chart(plot_max(), use_container_width=True)
