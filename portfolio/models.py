from django.db import models


LINE_CHOICES = [("algo", "Алгоритмы"), ("db", "Базы данных"), ("sys", "Системное")]
STATUS_CHOICES = [("done", "Готово"), ("current", "В работе"), ("future", "В планах")]
GROUP_CHOICES = [("courses", "Курсы"), ("olympiads", "Олимпиады"), ("achievements", "Достижения")]


class Project(models.Model):
    # identity
    slug        = models.SlugField(unique=True)
    line        = models.CharField(max_length=10, choices=LINE_CHOICES)
    year        = models.CharField(max_length=4)
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default="done")
    on_map      = models.BooleanField(default=True)
    you_are_here = models.BooleanField(default=False)

    # bilingual text
    name_ru     = models.CharField(max_length=120)
    name_en     = models.CharField(max_length=120)
    desc_ru     = models.TextField(blank=True)
    desc_en     = models.TextField(blank=True)

    # tech
    stack       = models.JSONField(default=list)   # ["Python", "Redis", ...]
    repo_slug   = models.CharField(max_length=120, blank=True)  # e.g. "deka4core/graph-suite"

    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-year", "order"]

    def __str__(self):
        return f"{self.name_ru} ({self.year})"


class ProjectMedia(models.Model):
    project     = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="media")
    file        = models.ImageField(upload_to="projects/%Y/")
    media_type  = models.CharField(max_length=10, default="image")  # "image" | "gif"
    caption_ru  = models.CharField(max_length=200, blank=True)
    caption_en  = models.CharField(max_length=200, blank=True)
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.project.name_ru} — media {self.order}"


class Certificate(models.Model):
    group       = models.CharField(max_length=20, choices=GROUP_CHOICES)
    year        = models.CharField(max_length=4)

    title_ru    = models.CharField(max_length=200)
    title_en    = models.CharField(max_length=200)
    issuer_ru   = models.CharField(max_length=200, blank=True)
    issuer_en   = models.CharField(max_length=200, blank=True)
    cred_ru     = models.CharField(max_length=200, blank=True)
    cred_en     = models.CharField(max_length=200, blank=True)

    skills      = models.JSONField(default=list)
    scan        = models.ImageField(upload_to="certs/%Y/", blank=True, null=True)

    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-year", "order"]

    def __str__(self):
        return f"{self.title_ru} ({self.year})"
