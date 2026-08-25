import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import {
  notFoundError,
  badRequestError,
  unauthorizedError,
} from "../errors/index.js";
import {
  addFeedbackSchema,
  feedbackIdSchema,
} from "../schemas/feedback.schema.js";

export const addFeedback = async (req, res) => {
  const validatedData = addFeedbackSchema.parse(req.body);
  const authorId = req.user.userId || req.user.id;

  // Prevent users from leaving feedback on their own profile
  if (authorId === validatedData.recipientId) {
    throw new badRequestError("You cannot leave feedback on your own profile.");
  }

  const recipient = await prisma.user.findUnique({
    where: { id: validatedData.recipientId },
  });

  if (!recipient) {
    throw new notFoundError("Recipient not found.");
  }

  const feedback = await prisma.profileFeedback.create({
    data: {
      content: validatedData.content,
      authorId,
      recipientId: validatedData.recipientId,
    },
    include: {
      author: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });

  res.status(statusCodes.CREATED).json(feedback);
};

export const getFeedbackForUser = async (req, res) => {
  const { username } = req.params;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new notFoundError(`User @${username} not found`);
  }

  const feedback = await prisma.profileFeedback.findMany({
    where: { recipientId: user.id },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(statusCodes.OK).json(feedback);
};

export const deleteFeedback = async (req, res) => {
  const { id } = feedbackIdSchema.parse(req.params);
  const requesterId = req.user.userId || req.user.id;

  const feedback = await prisma.profileFeedback.findUnique({
    where: { id },
  });

  if (!feedback) {
    throw new notFoundError("Feedback not found.");
  }

  // Security check: Only the author OR the recipient can delete it
  const canDelete =
    feedback.authorId === requesterId || feedback.recipientId === requesterId;

  if (!canDelete) {
    throw new unauthorizedError(
      "You do not have permission to delete this feedback.",
    );
  }

  await prisma.profileFeedback.delete({ where: { id } });
  res.status(statusCodes.NO_CONTENT).send();
};
