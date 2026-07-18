import { Job } from 'bullmq';

import { SignalProcessorService } from '../services/signal-processor.service';

export const handleSignalIngressJob = async (
  job: Job<{ signalEventId: string }>,
  signalProcessor: SignalProcessorService,
) => {
  return signalProcessor.process(job.data.signalEventId);
};
