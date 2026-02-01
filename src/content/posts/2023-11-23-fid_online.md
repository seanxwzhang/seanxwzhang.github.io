---
title: "Interactive Fréchet"
date: 2023-11-23
description: "Walk the walk and walk the dog"
tags: [Algorithms, Visualization]
category: deep-learning
slug: fid_online
---

## The question


Imagine that you have 2 curves in a 2-D space, **how would you measure the similarity of these 2 curves?**


![Two random curves, how to define the similarity between them?](/images/posts/fid_online-0.png)


This question turns out to be of great importance, as it helps answer the following question:

- In machine learning, generative models need to be evaluated by comparing the data likelihood of generated output vs. the training dataset
- In robotics, different movement trajectories need to be compared to evaluate their performance
- In geographic information systems, trajectories of road, river, movements of animals need to be compared, where a similarity measure needs to be defined

There’re some general properties we wish the distance measure $D$ to have:

1. **Commutativity**: $D(A, B) = D(B, A)$ for curve $A$ and $B$
2. **Translation invariant**: $D(A+\lambda, B + \lambda) = D(A, B)$, where $A+\lambda$ is to translating all the points on $A$ by $\lambda$
3. **Definition of zero**: $D(A, A) = 0$

There’re also some properties that we want for the specific case of curves:

1. **Global instead of local**: we want the distance measure to be defined in a global sense, as opposed to relying on specific points on these curve
2. **Continuous in addition to discrete**: we want the distance measure to have a natural extension to continuous curves
3. **Insensitive to length**: we don’t want the distance measure to be a function of the length of either curves

It would not be trivial to define a such measure. For example, one can naively define the weighted sum/integral of square distances between all point pairs on these curves, i.e.,


$$
D = \frac{1}{Z}\int\int\lVert A(t) - B(\tau)\rVert_2^2d\tau dt
$$


where $Z$ could be a normalizing factor to normalize out the effect of length of these 2 curves (otherwise the longer curves are, the more dissimilar they will be, despite that they can be very similar). However, because a close-form solution for the length of any finite curve might not exist, it doesn’t have a nice close-form expression. Another downside is that this formulation is basically describing “on average, how distant a point in curve A is from a point in curve B”, which might not be ideal.


Consider the following 2 curves:


![Untitled.png](/images/posts/fid_online-1.png)


These 2 curves are almost parallel, except one has made a rather zigzag “detour”. If we are doing weight average, the distance between these 2 curves will be dominated by the “detour” as the “detour” takes a larger proportion in the upper curve. This might be something we want, but it neglects the fact that these 2 curves are very similar if we don’t look at the detour.


Is there a way to define a measure such that it doesn’t weight the distance so uniformly? But take into account the overall shape?


## **Fréchet** Distance 


The  Fréchet Distance is mathematically defined as


$$
\begin{aligned}
D(A, B) &:= \overbrace{\min_{\alpha, \beta}}^{\text{Taking minimum over function space}}\max_{t\in[0, 1]}\left\{d(A(\alpha(t)), B(\beta(t)))\right\}\\
\text{where }&A, B\text{ are curves }\\& A, B:[0, 1] \rightarrow \mathcal{R}^2\\
&\alpha, \beta \text{ are any arbitrary {non-decreasing} scalar function} \\&\alpha, \beta: [0, 1]\rightarrow[0,1] \text{ s.t.}\quad\alpha(\tau_1) \leq\alpha(\tau_2)\quad \forall \tau_1\leq\tau_2\\
&t\in[0, 1]
\end{aligned}
$$


In English, this is to say:


> 👉 Let’s suppose you are walking a dog. You are walking along curve A, the dog is walking along curve B. What’s the shortest leash that allows both you and the dog to finish the walk?


I’ve found this explanation quite fascinating, because it gives such a good intuition to an otherwise complicated mathematical definition (especially because it’s doing a min over function space).


It’s such a good explanation that I build a demo for this.


![Fréchet Distance demo: the distance is indicated by the radius of the circles (all of the same radius); The green lines are the shortest distance from each red points from curve 1 to curve 2, all of the green lines should be shorter than Fréchet distance. ](https://prod-files-secure.s3.us-west-2.amazonaws.com/15aa9ffc-40dc-4d41-b533-55d2569f94bf/7e6e47df-d28c-4bcc-b72d-8546831fa7dc/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466ZCBNCIQV%2F20260114%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260114T195047Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEFoaCXVzLXdlc3QtMiJHMEUCIHGWEalXLKASWz2%2FUL4sKY4Rawmx0z%2FF9s7BdaKyGgMXAiEAq7S5B4eDpy0VRia44SYvf1vum1Ze6qgfTf%2BZ1HYj%2Bxwq%2FwMIIxAAGgw2Mzc0MjMxODM4MDUiDL33ycOVEsxv%2FLjhJyrcA1OmvfJ36Y9k14Vgm0%2BjOAWn83KdWJPvBXlSqEdVL8dL%2BieCmZ3aeYugz%2FYwFdZ%2B0tiELoRFRwt%2FP3QAmutd%2F3tMxjyFk%2Fv7G%2BsQpI0P%2FntjaQL81P6w3pDJycn3mnfbTEGV2xxpAeT1AJYvf%2BiUF4wMsqRcXmlFz7CXmOWOUy4YuPrAxgYlDCsTxpWhJyUz89nu9jXyO810vG2tNA6soBBr0OyNCriXDq7o10Vqc0kywz4%2FhB0cb5qcw9m6aAMoBM5VSrdfE01syaSEKg2HVYKuzBYIw2ihvwNh3xiq9jBCq5OVs%2FeYJbhvG2gLCMIfUw4pITmZI%2FQahlenYiZ4Z9vN4lGk3%2BxJy5G0rhRo06LuGrubTRepuzUTMjEjxbY1GXE7sPFK0n%2FV7ladPKpYF%2F1En7L%2F%2B%2BAh9vVtjFPwvKFlcBpBRBrw8Cdv6vCYgy7ylW5UX%2Bm0tDPdKwFCKytNQ1oTufkebgMenMre6lVohD7h9YQ1iZucYeyC1tcUZPDvnYkMJIV19wug9yysMwjg45Uy7g%2FE%2BBUBI42OsNg761%2FmPNT4CY9CVW3Us2rrbVjD28n%2BO8SXd2b798Rz1OLkTg7i103OR5S8u1Nde2hxUcaKddYDBGqQ%2BedwOU3YMP21n8sGOqUBYr%2FPeLYUPMbPeMlEARSgCqbnUAhbG3L%2F9XWNhWTdYmeoXVJkCXpocniBbC61a9DY1214%2FeQqFxEh%2FM5DFC0SXgMhZuc5LnM9MjBRs1bSw5Ue%2F9oNP6SK3c%2F2mBbrDphJa3%2F2qFT%2F3nN4GFE2lhsMXoiuoFpMQIRnb3uqcg21IP8qiK11a7s1jcekqdMDi8vD8GGRKRWfIQpEBdvzXJj7Izsbmm9a&X-Amz-Signature=156f3f68256b60fd345c8654a5f6ed68c3dee9fb2f3ade12fd76811fdc61a1ce&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)


## [Demo](https://www.seanzhang.me/demo/fd)


The following [demo](https://www.seanzhang.me/demo/fd) allows you to

- Draw 2 arbitrary curves
- Calculate the Fréchet distance automatically
- Demonstrate the effect of walking a dog by sliding the slider
