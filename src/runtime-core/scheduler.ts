const queue: any[] = [];
let flushing = false;

export function nextTick(fn?) {
  return fn ? Promise.resolve().then(fn) : Promise.resolve();
}

export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }

  if (!flushing) {
    queueFlush();
  }
}

function queueFlush() {
  if (flushing) {
    return;
  }

  flushing = true;
  nextTick(flushJobs);
}

function flushJobs() {
  flushing = false;
  let job;
  while ((job = queue.shift())) {
    job && job();
  }
}
