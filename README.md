# particles 2015/02/04
Partical Collision simulation - more info: https://ciancode.com/particles


[![image](https://user-images.githubusercontent.com/4098222/142854993-e7233643-97eb-482e-b813-de899aa33ac7.png)](https://cianmce.github.io/particles/)


# [Live Demo](https://cianmce.github.io/particles/)

## Each particle has its own:
- Color
- Size
- Mass
- Density
- Elasticity (Coefficient of Restitution)
- Surface Area
- Lifespan


## Collisions were modelled for:
- Walls and the roof(if On)
- With other particles
- All collisions took the radial distance from the particle center taking it’s individual Coefficient of Restitution and mass into account.


## Two main forces were accounted for:
- Gravity for various Planets, F = M*G
- Friction with various mediums (Drag), F = 0.5*C*p*A*V2


## Controls:
- Clicking places a “Launcher” Draging changes particles initial velocity
- SpaceBar, ‘M’ or Menu Button key shows/hides menu
- ‘P’ pauses the movement of the particles
- Ctrl/CMD to toggle grabbing mode
  - Click and Hold on particle to grab it
  - Release to throw


## Sound:
- Popping sound when particles die
- Bouncing sound when particles have a collision with volume proportional to magnitude of collision
 
