// Лендинг «Линия дома»: квиз и проекты работают всегда, движение только
// когда пользователь его не отключил.
import { initMotion } from './motion';
import { initProjects } from './projects';
import { initQuiz } from './quiz';

export function initDom() {
  initQuiz();
  initProjects();
  initMotion();
}
