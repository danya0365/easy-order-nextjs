/**
 * Pushes a plain-text message to an external channel (e.g. LINE). Targeting is
 * by the channel's own user id (LINE userId), resolved by the caller.
 * Implementations must never throw for a single failed push.
 */
export interface IMessagePusher {
  pushText(channelUserId: string, text: string): Promise<void>;
}
