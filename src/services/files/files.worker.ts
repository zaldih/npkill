import { Dir, Dirent, opendir } from 'fs';

import EventEmitter from 'events';
import { WorkerMessage, WorkerStats } from './files.worker.service';
import { basename, join } from 'path';
import { MessagePort, parentPort } from 'node:worker_threads';
import { IListDirParams } from '../../interfaces';
import { EVENTS, MAX_PROCS } from '../../constants/workers.constants.js';

enum ETaskOperation {
  'explore',
  'getSize',
}
interface Task {
  operation: ETaskOperation;
  path: string;
}

(() => {
  let id = 0;
  let fileWalker: FileWalker;
  let tunnel: MessagePort;

  if (!parentPort) {
    throw new Error('Worker must be spawned from a parent thread.');
  }

  parentPort.on('message', (message: WorkerMessage) => {
    if (message?.type === EVENTS.startup) {
      id = message.value.id;
      tunnel = message.value.channel;
      fileWalker = new FileWalker();
      initTunnelListeners();
      initFileWalkerListeners();
      notifyWorkerReady();
    }
  });

  function notifyWorkerReady() {
    tunnel.postMessage({
      type: EVENTS.alive,
      value: null,
    });
  }

  function initTunnelListeners() {
    tunnel.on('message', (message: WorkerMessage) => {
      if (message?.type === EVENTS.exploreConfig) {
        fileWalker.setSearchConfig(message.value);
      }

      if (message?.type === EVENTS.explore) {
        fileWalker.enqueueTask(message.value.path);
      }
    });
  }

  function initFileWalkerListeners() {
    fileWalker.events.on('newResult', ({ results }) => {
      tunnel.postMessage({
        type: EVENTS.scanResult,
        value: { results, workerId: id, pending: fileWalker.pendingJobs },
      });
    });
  }
})();

class FileWalker {
  readonly events = new EventEmitter();
  private searchConfig: IListDirParams = {
    path: '',
    target: '',
    exclude: [],
  };
  private taskQueue: Task[] = [];
  private completedTasks = 0;
  private procs = 0;

  setSearchConfig(params: IListDirParams) {
    this.searchConfig = params;
  }

  enqueueTask(path: string) {
    this.taskQueue.push({ path, operation: ETaskOperation.explore });
    this.processQueue();
  }

  private run(path: string) {
    this.updateProcs(1);

    opendir(path, async (err, dir: Dir) => {
      if (err) {
        // Should notify important errors
        this.completeTask();
        return;
      }

      this.analizeDir(path, dir);
    });
  }

  private async analizeDir(path: string, dir: Dir) {
    const results = [];
    let entry: Dirent | null = null;
    while ((entry = await dir.read().catch(() => null)) != null) {
      this.newDirEntry(path, entry, results);
    }

    this.events.emit('newResult', { results: results });

    await dir.close();
    this.completeTask();

    if (this.taskQueue.length === 0 && this.procs === 0) {
      this.completeAll();
    }
  }

  private newDirEntry(path: string, entry: Dirent, results: any[]) {
    const subpath = join(path, entry.name);
    const shouldSkip = !entry.isDirectory() || this.isExcluded(subpath);
    if (shouldSkip) {
      return;
    }

    results.push({
      path: subpath,
      isTarget: this.isTargetFolder(entry.name),
    });
  }

  private isExcluded(path: string) {
    if (!this.searchConfig.exclude) {
      return;
    }
    for (let i = 0; i < this.searchConfig.exclude.length; i++) {
      const excludeString = this.searchConfig.exclude[i];
      if (path.includes(excludeString)) {
        return true;
      }
    }
    return false;
  }

  private isTargetFolder(path: string): boolean {
    // return basename(path) === this.searchConfig.target;
    return path === this.searchConfig.target;
  }

  private completeTask() {
    this.updateProcs(-1);
    this.processQueue();
    this.completedTasks++;
  }

  private updateProcs(value: number) {
    this.procs += value;
  }

  private processQueue() {
    while (this.procs < MAX_PROCS && this.taskQueue.length > 0) {
      const path = this.taskQueue.shift()?.path;
      if (!path) {
        return;
      }
      this.run(path);
    }
  }

  private completeAll() {
    // Any future action.
  }

  /*  get stats(): WorkerStats {
    return {
      pendingSearchTasks: this.taskQueue.length,
      completedSearchTasks: this.completedTasks,
      procs: this.procs,
    };
  } */

  get pendingJobs() {
    return this.taskQueue.length;
  }
}
