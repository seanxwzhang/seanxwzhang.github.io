---
title: "Your typical HF architecture"
date: 2022-04-22
description: "If you were to design an HF"
tags: [HF, System deisgn]
category: deep-learning
slug: hft_system_diagram
---

I was trying to explain what a small quantitative hedge fund would look like to a few friends, and to my surprise (or maybe not such considering the prevalence of non-compete in this industry), there’re very limited information online regarding the internal workings of a hedge fund might look like.


I’m also bound by non-compete, but I believe a lot of the system-level designs are general enough that can be applied to every hedge fund. So I drew this diagram in order to share yet another typical system design problem, design your typical hedge fund!


_I specifically removed anything that I believe is specific to any of my (previous) employers._ 


# Architecture


Typically, a quantitative hedge fund runs the following loop:

1. Researchers tweak models according to various factors (alpha decay, new ideas, etc.)
2. Run backtest, good result? No, go back to 1; Yes, go to 3
3. Deploy the model
4. Make money? No, go back to 1; Yes, go back to 1.

To make the above happen, there’re a few components that need to be in place.

1. Data feed manager: this is the component that talks to third-party data vendors via API, websocket, SFTP, FTP (yeah, you heard me right).
2. Backtest engine: this is the component which runs a given strategy across time to verify a new idea works (probably)
3. Model runtime: this is the runtime for models to make actual predictions in live-trading & backtesting. The output here is usually security’s price prediction over some time horizon.
4. Optimization engine: after obtaining predictions, there’re likely some constrained-optimizations that need to happen (liquidity constraint, mandate constraint, compliance constraint, etc.), this is also where different optimization objective comes into play. The output here is usually a desired portfolio over some time horizon.
5. Execution engine: after obtaining desired portfolios, orders are calculated and sent to exchange/prime brokers. Note that there can be a lot of further optimization opportunities here in terms of how orders are routed and executed.

That’s about it (and I should refrain from sharing any details), refer to the following architecture diagram to design your own HF!


![Untitled.png](/images/posts/hft_system_diagram-0.png)

