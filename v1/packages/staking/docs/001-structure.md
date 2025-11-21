# Staking package structure

## Problem

Staking package should have a well described way of splitting the code, based on our past experiences.
The way for the separation of concerns should be easy to understand by any developer reading this codebase.

## Solution

There are numerous ways to split the codebase including:

1. Atomic Design (atoms, molecules, organisms, templates, and views)
2. NextJS-like simple split (components, views)
3. BEM-like splitting (elements, blocks)
4. Flat components directories
5. Feature-based design

We have chosen to go with Feature-based design.
We also discussed combining Feature-based design with Atomic Design, but it seemed to be an overkill.

### Proposed structure

- src
  - features
    - overview
      - OverviewNavigation
      - StakingCard
      - StakingOverviewView
      - index
    - StakingView
      - StakingView
      - index
