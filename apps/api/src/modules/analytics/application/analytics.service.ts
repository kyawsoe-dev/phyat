import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AnalyticsEventType } from "@prisma/client";
import { AnalyticsRepository } from "../infrastructure/analytics.repository";
import { ClickContext } from "../../links/application/dto";

type GeoResult = {
  country: string;
  region: string;
  city: string;
};

type CacheEntry = {
  value: GeoResult;
  expiresAt: number;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly geoCache = new Map<string, CacheEntry>();
  private readonly geoCacheTtlMs = 3_600_000;

  constructor(private readonly analytics: AnalyticsRepository) {}

  async trackClick(
    linkId: string,
    context: ClickContext,
    eventType: AnalyticsEventType = "CLICK",
  ): Promise<void> {
    const [location, agent, referrerDomain] = await Promise.all([
      this.geoLookup(context.ip),
      this.parseUserAgent(context.userAgent),
      this.referrerDomain(context.referrer),
    ]);

    const ip = context.ip || undefined;

    void this.analytics
      .create({
        linkId,
        eventType,
        userAgent: context.userAgent,
        ...agent,
        referrer: context.referrer || "Direct",
        referrerDomain,
        ip,
        ...location,
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Analytics write failed for link ${linkId}: ${String(error)}`,
        );
      });
  }

  async getClicks(linkId: string, userId: string) {
    const result = await this.analytics.listByLink(linkId, userId);
    if (result.total === 0) return { data: [], total: 0 };
    return result;
  }

  async getStats(linkId: string, userId: string) {
    const stats = await this.analytics.getStatsByLink(linkId, userId);
    if (!stats) throw new NotFoundException("Link not found or access denied.");
    return stats;
  }

  private parseUserAgent(userAgent?: string) {
    const ua = userAgent ?? "";
    const device = /mobile|android|iphone|ipad/i.test(ua)
      ? "mobile"
      : "desktop";
    const browser = /edg/i.test(ua)
      ? "Edge"
      : /chrome/i.test(ua)
        ? "Chrome"
        : /safari/i.test(ua)
          ? "Safari"
          : /firefox/i.test(ua)
            ? "Firefox"
            : "Unknown";
    const os = /windows/i.test(ua)
      ? "Windows"
      : /mac os|macintosh/i.test(ua)
        ? "macOS"
        : /android/i.test(ua)
          ? "Android"
          : /iphone|ipad/i.test(ua)
            ? "iOS"
            : /linux/i.test(ua)
              ? "Linux"
              : "Unknown";
    return { browser, os, device };
  }

  private referrerDomain(referrer?: string) {
    if (!referrer) return "direct";
    try {
      return new URL(referrer).hostname;
    } catch {
      return "direct";
    }
  }

  private async geoLookup(ip?: string): Promise<GeoResult> {
    if (!ip || this.isPrivateIp(ip)) {
      return { country: "Myanmar", region: "Yangon", city: "Yangon" };
    }

    const cached = this.geoCache.get(ip);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const apiKey = process.env.IP_GEOLOCATION_API_KEY;
    if (!apiKey) {
      return { country: "Myanmar", region: "Yangon", city: "Yangon" };
    }

    try {
      const response = await fetch(
        `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}&fields=country_name,state_prov,city`,
        { signal: AbortSignal.timeout(3000) },
      );

      if (!response.ok) {
        this.logger.warn(`GeoIP API returned ${response.status} for IP ${ip}`);
        return { country: "Myanmar", region: "Yangon", city: "Yangon" };
      }

      const data = await response.json();
      const result: GeoResult = {
        country: data.country_name || "Myanmar",
        region: data.state_prov || "Yangon",
        city: data.city || "Yangon",
      };

      this.geoCache.set(ip, {
        value: result,
        expiresAt: Date.now() + this.geoCacheTtlMs,
      });
      return result;
    } catch (error) {
      this.logger.warn(`GeoIP lookup failed for IP ${ip}: ${String(error)}`);
      return { country: "Myanmar", region: "Yangon", city: "Yangon" };
    }
  }

  private isPrivateIp(ip: string): boolean {
    if (ip === "::1" || ip === "localhost" || ip === "0.0.0.0") return true;
    if (ip.includes(":")) {
      const v6 = ip.toLowerCase();
      if (
        v6.startsWith("fc") ||
        v6.startsWith("fd") ||
        v6 === "::" ||
        v6.startsWith("fe80")
      )
        return true;
      return false;
    }
    return (
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
      ip.startsWith("127.")
    );
  }
}
