import { ValidationException } from "./exceptions.js";

/**
 * Value Object representing a validated and normalized Creator Email address.
 */
export class Email {
  private readonly value: string;

  /**
   * Constructs and validates an Email Value Object.
   *
   * @param rawEmail - The raw email string.
   * @throws ValidationException if the email format is invalid.
   */
  constructor(rawEmail: string) {
    if (!rawEmail || typeof rawEmail !== "string") {
      throw new ValidationException("Email address must be a non-empty string.");
    }
    const normalized = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new ValidationException(`Invalid email format: '${rawEmail}'`);
    }
    this.value = normalized;
    Object.freeze(this);
  }

  /**
   * Retrieves the normalized email string value.
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Compares this email value object with another for equality.
   */
  public equals(other: Email): boolean {
    return other instanceof Email && this.value === other.getValue();
  }
}

/**
 * Value Object representing speaking pacing calculations for a script section.
 */
export class SpeakingPacingInfo {
  public readonly wordCount: number;
  public readonly wordsPerMinute: number;

  /**
   * Constructs a SpeakingPacingInfo Value Object.
   *
   * @param wordCount - Total number of words in the text.
   * @param wordsPerMinute - Target speaking speed (defaults to 150 WPM).
   * @throws ValidationException if count or rate parameters are invalid.
   */
  constructor(wordCount: number, wordsPerMinute: number = 150) {
    if (wordCount < 0) {
      throw new ValidationException("Word count cannot be negative.");
    }
    if (wordsPerMinute <= 0) {
      throw new ValidationException("Words per minute must be greater than zero.");
    }
    this.wordCount = Math.round(wordCount);
    this.wordsPerMinute = Math.round(wordsPerMinute);
    Object.freeze(this);
  }

  /**
   * Calculates the estimated duration of the spoken text in seconds.
   */
  public getDurationInSeconds(): number {
    return (this.wordCount / this.wordsPerMinute) * 60;
  }

  /**
   * Compares this pacing info object with another for equality.
   */
  public equals(other: SpeakingPacingInfo): boolean {
    return (
      other instanceof SpeakingPacingInfo &&
      this.wordCount === other.wordCount &&
      this.wordsPerMinute === other.wordsPerMinute
    );
  }
}

/**
 * Value Object representing a validated confidence score between 0 and 100.
 */
export class ConfidenceScore {
  public readonly value: number;

  /**
   * Constructs a ConfidenceScore Value Object.
   *
   * @param value - The integer score value.
   * @throws ValidationException if score is out of the 0-100 range.
   */
  constructor(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new ValidationException(
        `Confidence score must be an integer between 0 and 100. Got: ${value}`
      );
    }
    this.value = value;
    Object.freeze(this);
  }

  /**
   * Compares this confidence score with another for equality.
   */
  public equals(other: ConfidenceScore): boolean {
    return other instanceof ConfidenceScore && this.value === other.value;
  }
}

/**
 * Value Object representing the percentage coverage of source material from different libraries.
 */
export class SourceCoverage {
  public readonly projectPercent: number;
  public readonly personalPercent: number;
  public readonly platformPercent: number;
  public readonly publicPercent: number;

  /**
   * Constructs a SourceCoverage Value Object.
   *
   * @param coverage - The relative percent contribution of each layer.
   * @throws ValidationException if the sum of layers does not equal exactly 100%.
   */
  constructor(coverage: {
    projectPercent: number;
    personalPercent: number;
    platformPercent: number;
    publicPercent: number;
  }) {
    const { projectPercent, personalPercent, platformPercent, publicPercent } = coverage;

    if (projectPercent < 0 || personalPercent < 0 || platformPercent < 0 || publicPercent < 0) {
      throw new ValidationException("Coverage percentages cannot be negative.");
    }

    const total = projectPercent + personalPercent + platformPercent + publicPercent;
    // Account for potential floating point rounding, but require integers
    if (Math.round(total) !== 100) {
      throw new ValidationException(
        `Total source coverage must sum to exactly 100%. Got sum of: ${total}%`
      );
    }

    this.projectPercent = Math.round(projectPercent);
    this.personalPercent = Math.round(personalPercent);
    this.platformPercent = Math.round(platformPercent);
    this.publicPercent = Math.round(publicPercent);
    Object.freeze(this);
  }

  /**
   * Compares this source coverage with another for equality.
   */
  public equals(other: SourceCoverage): boolean {
    return (
      other instanceof SourceCoverage &&
      this.projectPercent === other.projectPercent &&
      this.personalPercent === other.personalPercent &&
      this.platformPercent === other.platformPercent &&
      this.publicPercent === other.publicPercent
    );
  }
}
