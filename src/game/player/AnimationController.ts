import * as THREE from 'three';
import { HumanSurvivorModel } from './HumanSurvivorModel';

export type MovementState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'SPRINT'
  | 'JUMP'
  | 'FALL'
  | 'LAND'
  | 'SWIM'
  | 'SWIM_IDLE'
  | 'WATER_ENTER'
  | 'WATER_EXIT';

export class AnimationController {
  private model: HumanSurvivorModel;
  public currentState: MovementState = 'IDLE';
  private currentAction?: THREE.AnimationAction;

  constructor(model: HumanSurvivorModel) {
    this.model = model;
  }

  public setState(newState: MovementState): void {
    if (this.currentState === newState) return;
    this.currentState = newState;

    if (!this.model.mixer) return;

    let clipKey = 'idle';
    let timeScale = 1.0;

    switch (newState) {
      case 'IDLE':
        clipKey = 'idle';
        timeScale = 1.0;
        break;
      case 'WALK':
        clipKey = 'walk';
        timeScale = 1.0;
        break;
      case 'RUN':
        clipKey = 'run';
        timeScale = 1.35;
        break;
      case 'SPRINT':
        clipKey = 'run';
        timeScale = 1.85;
        break;
      case 'JUMP':
        clipKey = 'jump';
        timeScale = 1.2;
        break;
      case 'FALL':
        clipKey = 'fall';
        timeScale = 1.0;
        break;
      case 'LAND':
        clipKey = 'idle';
        timeScale = 1.0;
        break;
      case 'SWIM':
        clipKey = 'swim';
        timeScale = 1.15;
        break;
      case 'SWIM_IDLE':
        clipKey = 'swim_idle';
        timeScale = 1.0;
        break;
      case 'WATER_ENTER':
        clipKey = 'swim';
        timeScale = 1.4;
        break;
      case 'WATER_EXIT':
        clipKey = 'walk';
        timeScale = 0.8;
        break;
    }

    const nextAction = this.model.animations.get(clipKey);

    if (nextAction && nextAction !== this.currentAction) {
      nextAction.reset();
      nextAction.timeScale = timeScale;
      nextAction.play();

      if (this.currentAction) {
        this.currentAction.crossFadeTo(nextAction, 0.22, true);
      }
      this.currentAction = nextAction;
    }
  }

  public update(dt: number): void {
    if (this.model.mixer) {
      this.model.mixer.update(dt);
    }
  }
}
